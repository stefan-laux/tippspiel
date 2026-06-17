import "server-only";
import * as cheerio from "cheerio";
import { getCommunityConfig, isChampionQuestion, BONUS_ROUND } from "@/lib/config";
import { findTeamByName, type TeamRef } from "@/data/teams";
import type { TeamInfo, MatchStatus } from "@/lib/types";

// Scrapes PUBLIC data from the SRF WM-Tippspiel ("Betty" engine, Rails-rendered HTML).
// There is no JSON API: data lives inside HTML-escaped JSON in `data-react-props`
// attributes on react_component blocks (data-react-class="ScoreBet" / "TextSelection").
// No login or cookie is required. This module only fetches + parses single pages;
// the orchestrator decides what to fetch.

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0 Safari/537.36";

async function fetchHtml(url: string, attempt = 0): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      // 5xx / 408 / 429 are worth retrying; other 4xx (404/403/410) are permanent.
      const retryable = res.status >= 500 || res.status === 408 || res.status === 429;
      throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { retryable });
    }
    return await res.text();
  } catch (err) {
    const retryable = (err as { retryable?: boolean })?.retryable ?? true; // network/abort -> retry
    if (retryable && attempt < 2) {
      await sleep(500 * (attempt + 1) + Math.floor(Math.random() * 250)); // backoff + jitter
      return fetchHtml(url, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// --- React-props extraction ---------------------------------------------------

interface ReactBlock {
  className: string;
  props: Record<string, unknown>;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function extractReactBlocks($: cheerio.CheerioAPI): ReactBlock[] {
  const blocks: ReactBlock[] = [];
  $("[data-react-class]").each((_, el) => {
    const className = $(el).attr("data-react-class") ?? "";
    const rawProps = $(el).attr("data-react-props");
    if (!rawProps) return;
    let parsed: Record<string, unknown> | undefined;
    try {
      parsed = JSON.parse(rawProps);
    } catch {
      try {
        parsed = JSON.parse(decodeEntities(rawProps));
      } catch {
        return; // skip unparseable block
      }
    }
    if (parsed) blocks.push({ className, props: parsed });
  });
  return blocks;
}

// --- Members ------------------------------------------------------------------

export interface ScrapedMember {
  slug: string;
  displayName: string;
  isAdmin: boolean;
  rank: number;
  groupPoints: number;
  globalPoints: number;
}

function parseIntSafe(s: string | undefined | null): number {
  if (!s) return 0;
  const m = s.replace(/[’']/g, "").match(/-?\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

const MAX_MEMBER_PAGES = 50;

function parseMemberRows($: cheerio.CheerioAPI, members: ScrapedMember[], seen: Set<string>): number {
  let added = 0;
  $(".rankingItem--communityMember").each((_, el) => {
    const $el = $(el);
    const $link = $el.find(".rankingItem__link").first();
    const slug = ($link.attr("href") ?? "").match(/\/users\/([^/?#]+)/)?.[1];
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    added++;
    members.push({
      slug,
      displayName: $link.text().trim() || slug,
      isAdmin: $el.find(".rankingItem__role").text().toLowerCase().includes("admin"),
      rank: parseIntSafe($el.find(".rankingItem__rank").first().text()) || members.length,
      groupPoints: parseIntSafe($el.find(".rankingItem__points").first().text()),
      globalPoints: parseIntSafe($el.find(".rankingItem__globalPoints").first().text()),
    });
  });
  return added;
}

export async function fetchCommunityMembers(): Promise<ScrapedMember[]> {
  const { url } = getCommunityConfig();
  const members: ScrapedMember[] = [];
  const seen = new Set<string>();

  // The SRF ranking list is paginated via ?page=N. Walk pages until one adds no new
  // members (a too-large page index returns an empty list), so big communities aren't
  // silently truncated. ?page is ignored gracefully by SRF for single-page communities.
  for (let page = 1; page <= MAX_MEMBER_PAGES; page++) {
    const pageUrl = page === 1 ? url : `${url}${url.includes("?") ? "&" : "?"}page=${page}`;
    const $ = cheerio.load(await fetchHtml(pageUrl));
    const added = parseMemberRows($, members, seen);
    if (added === 0) break;
  }

  // Fallback: derive members from any /users/ links on page one if the selector misses.
  if (members.length === 0) {
    const $ = cheerio.load(await fetchHtml(url));
    $(".rankingList a[href^='/users/']").each((_, el) => {
      const slug = ($(el).attr("href") ?? "").match(/\/users\/([^/?#]+)/)?.[1];
      if (!slug || seen.has(slug)) return;
      seen.add(slug);
      members.push({
        slug,
        displayName: $(el).text().trim() || slug,
        isAdmin: false,
        rank: members.length + 1,
        groupPoints: 0,
        globalPoints: 0,
      });
    });
  }

  return members;
}

// --- User round (tips + fixtures + bonus) ------------------------------------

export interface ScrapedScoreBet {
  betId: string;
  round: number;
  eventDateMs: number;
  deadlineMs: number;
  status: MatchStatus;
  censored: boolean;
  home: TeamInfo;
  away: TeamInfo;
  location?: string;
  /** [home, away] prediction, or null if censored/missing. */
  picks: [number, number] | null;
  /** [home, away] actual result, or null if not available. */
  finalResults: [number, number] | null;
  /** SRF's own point breakdown {winner,home,away,difference} (ground-truth cross-check). */
  srfScores: { winner: number; home: number; away: number; difference: number } | null;
  srfTotalScore: number | null;
}

export interface ScrapedBonus {
  betId: string;
  order: number;
  question: string;
  isChampion: boolean;
  options: { id: string; name: string }[];
  /** chosen answer id, or null if censored/none. */
  pick: string | null;
  censored: boolean;
  /** SRF's score for this answer (>0 once resolved -> lets us infer the correct answer). */
  srfTotalScore: number | null;
}

export interface RoundInfo {
  id: number;
  name: string;
}

export interface ScrapedUserRound {
  bets: ScrapedScoreBet[];
  bonus: ScrapedBonus[];
  rounds: RoundInfo[];
}

function toTeamInfo(raw: unknown): TeamInfo {
  const t = (raw ?? {}) as { id?: unknown; name?: unknown; image?: unknown };
  const name = typeof t.name === "string" ? t.name : "";
  // SRF team id: prefer teams[].id, else parse from the logo image filename.
  let srfId = t.id != null ? String(t.id) : "";
  if (!srfId && typeof t.image === "string") {
    srfId = t.image.match(/(\d+)\.png/)?.[1] ?? "";
  }
  const ref: TeamRef | undefined = findTeamByName(name);
  return {
    srfId,
    name: name || "?",
    fifaCode: ref?.fifaCode,
    iso2: ref?.iso2,
    flag: ref?.flagcdn,
  };
}

function eventStateToStatus(state: unknown): MatchStatus {
  if (state === "over") return "FINISHED";
  if (state === "progress") return "LIVE";
  return "SCHEDULED";
}

function toMs(v: unknown): number {
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof v === "number") return v > 1e12 ? v : v * 1000; // seconds -> ms heuristic
  return 0;
}

function pairOf(v: unknown): [number, number] | null {
  if (Array.isArray(v) && v.length >= 2 && v[0] != null && v[1] != null) {
    const h = Number(v[0]);
    const a = Number(v[1]);
    if (!Number.isNaN(h) && !Number.isNaN(a)) return [h, a];
  }
  return null;
}

function parseRoundOptions(blocks: ReactBlock[]): RoundInfo[] {
  const rounds: RoundInfo[] = [];
  const seen = new Set<number>();
  for (const b of blocks) {
    if (!/SelectRaceweek/i.test(b.className)) continue;
    const options = (b.props.options ?? b.props.raceweeks) as
      | { url?: string; name?: string }[]
      | undefined;
    if (!Array.isArray(options)) continue;
    for (const o of options) {
      const id = parseInt(o.url?.match(/\/round\/(\d+)/)?.[1] ?? "", 10);
      if (Number.isNaN(id) || seen.has(id)) continue;
      seen.add(id);
      rounds.push({ id, name: (o.name ?? "").trim() });
    }
  }
  return rounds;
}

/** Fetch and parse a single /users/{slug}/round/{round} page. */
export async function fetchUserRound(slug: string, round: number): Promise<ScrapedUserRound> {
  const { baseUrl } = getCommunityConfig();
  const html = await fetchHtml(`${baseUrl}/users/${slug}/round/${round}`);
  const $ = cheerio.load(html);
  const blocks = extractReactBlocks($);

  const bets: ScrapedScoreBet[] = [];
  const bonus: ScrapedBonus[] = [];

  for (const block of blocks) {
    const bet = (block.props as { bet?: Record<string, unknown> }).bet;
    if (!bet) continue;
    const type = bet.type;

    if (type === "score" || /ScoreBet/i.test(block.className)) {
      const teams = (bet.teams as unknown[]) ?? [];
      const censored = Boolean(bet.censored);
      const scores = bet.scores as
        | { winner?: number; home?: number; away?: number; difference?: number }
        | undefined;
      bets.push({
        betId: String(bet.bet_id ?? ""),
        round: Number(bet.round ?? round),
        eventDateMs: toMs(bet.event_date),
        deadlineMs: toMs(bet.deadline),
        status: eventStateToStatus(bet.event_state),
        censored,
        home: toTeamInfo(teams[0]),
        away: toTeamInfo(teams[1]),
        location: typeof bet.meta_location === "string" ? bet.meta_location : undefined,
        picks: censored ? null : pairOf(bet.picks),
        finalResults: pairOf(bet.final_results),
        srfScores: scores
          ? {
              winner: Number(scores.winner ?? 0),
              home: Number(scores.home ?? 0),
              away: Number(scores.away ?? 0),
              difference: Number(scores.difference ?? 0),
            }
          : null,
        srfTotalScore: bet.total_score != null ? Number(bet.total_score) : null,
      });
    } else if (type === "text_selection" || /TextSelection/i.test(block.className)) {
      const answers = ((bet.answers as { id?: unknown; name?: unknown }[]) ?? []).map((a) => ({
        id: String(a.id ?? ""),
        name: String(a.name ?? ""),
      }));
      const picks = bet.picks as unknown[];
      const eventName = String(bet.event_name ?? "");
      const question = String(bet.question ?? eventName);
      bonus.push({
        betId: String(bet.bet_id ?? ""),
        order: parseIntSafe(eventName) || bonus.length + 1,
        question,
        isChampion: isChampionQuestion(question),
        options: answers,
        pick: Array.isArray(picks) && picks.length > 0 ? String(picks[0]) : null,
        censored: Boolean(bet.censored),
        srfTotalScore: bet.total_score != null ? Number(bet.total_score) : null,
      });
    }
  }

  return { bets, bonus, rounds: parseRoundOptions(blocks) };
}

/** Convenience: fetch the bonus (Zusatzfragen) round for one user. */
export function fetchUserBonus(slug: string): Promise<ScrapedUserRound> {
  return fetchUserRound(slug, BONUS_ROUND);
}
