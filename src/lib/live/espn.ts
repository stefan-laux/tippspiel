import "server-only";
import { findTeamByApi } from "@/data/teams";
import type { Fixture } from "@/lib/types";

// Live match data from ESPN's public, key-free, uncapped scoreboard endpoint.
// Confirmed live for WC2026: returns in-play score + elapsed minute + status.
// Teams are resolved to our TeamRef via FIFA-style abbreviation (e.g. AUT, COD) or name.

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

export type EspnState = "pre" | "in" | "post";

export interface EspnTeamScore {
  fifaCode?: string;
  iso2?: string;
  name: string;
  goals: number | null;
}

export interface EspnMatch {
  kickoffMs: number;
  state: EspnState;
  /** Short status text: "Scheduled" | "HT" | "FT" | live minute like "67'". */
  detail: string;
  /** Live clock string, e.g. "67'" or "90'+14'". */
  clock: string;
  /** Numeric elapsed minutes parsed from the clock (null if not live). */
  elapsed: number | null;
  home: EspnTeamScore;
  away: EspnTeamScore;
}

interface RawCompetitor {
  homeAway?: string;
  score?: string;
  team?: { displayName?: string; abbreviation?: string; shortDisplayName?: string };
}
interface RawEvent {
  date?: string;
  status?: { displayClock?: string; clock?: number; type?: { state?: string; shortDetail?: string } };
  competitions?: { competitors?: RawCompetitor[] }[];
}

function toGoals(s: string | undefined): number | null {
  if (s == null || s === "") return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function parseElapsed(clock: string, state: EspnState): number | null {
  if (state !== "in") return null;
  // "67'" -> 67 ; "90'+14'" -> 90 (added time folded into the base minute for display)
  const m = clock.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function toCompetitor(c: RawCompetitor | undefined): EspnTeamScore {
  const name = c?.team?.displayName ?? c?.team?.shortDisplayName ?? "";
  const ref = findTeamByApi(name, c?.team?.abbreviation);
  return { fifaCode: ref?.fifaCode, iso2: ref?.iso2, name: name || "?", goals: toGoals(c?.score) };
}

function normalizeEvent(ev: RawEvent): EspnMatch | null {
  const comp = ev.competitions?.[0];
  const competitors = comp?.competitors ?? [];
  const homeRaw = competitors.find((c) => c.homeAway === "home") ?? competitors[0];
  const awayRaw = competitors.find((c) => c.homeAway === "away") ?? competitors[1];
  if (!homeRaw || !awayRaw) return null;
  const stateRaw = ev.status?.type?.state;
  const state: EspnState = stateRaw === "in" ? "in" : stateRaw === "post" ? "post" : "pre";
  const clock = ev.status?.displayClock ?? "";
  return {
    kickoffMs: ev.date ? Date.parse(ev.date) : 0,
    state,
    detail: ev.status?.type?.shortDetail ?? "",
    clock,
    elapsed: parseElapsed(clock, state),
    home: toCompetitor(homeRaw),
    away: toCompetitor(awayRaw),
  };
}

/**
 * Fetch the ESPN scoreboard. Pass UTC dates (YYYYMMDD) to widen the window across
 * timezones; the default response already covers the current match day.
 */
export async function fetchEspnScoreboard(dates?: string[]): Promise<EspnMatch[]> {
  const urls = dates && dates.length ? dates.map((d) => `${SCOREBOARD}?dates=${d}`) : [SCOREBOARD];
  const all: EspnMatch[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { events?: RawEvent[] };
      for (const ev of data.events ?? []) {
        const m = normalizeEvent(ev);
        if (!m) continue;
        const key = `${m.kickoffMs}:${m.home.fifaCode ?? m.home.name}:${m.away.fifaCode ?? m.away.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(m);
      }
    } catch {
      /* ignore a failed window; ESPN is best-effort */
    } finally {
      clearTimeout(timeout);
    }
  }
  return all;
}

function pairKey(a?: string, b?: string): string {
  return [a ?? "", b ?? ""].sort().join("|");
}

/**
 * Match each fixture to its ESPN match by the unordered FIFA-code pair, breaking ties
 * with the nearest kickoff. Returns a Map keyed by fixture id.
 */
export function matchEspnToFixtures(
  fixtures: Fixture[],
  espn: EspnMatch[],
): Map<string, EspnMatch> {
  const byPair = new Map<string, EspnMatch[]>();
  for (const m of espn) {
    if (!m.home.fifaCode || !m.away.fifaCode) continue;
    const k = pairKey(m.home.fifaCode, m.away.fifaCode);
    (byPair.get(k) ?? byPair.set(k, []).get(k)!).push(m);
  }
  const out = new Map<string, EspnMatch>();
  for (const f of fixtures) {
    const candidates = byPair.get(pairKey(f.home.fifaCode, f.away.fifaCode));
    if (!candidates || candidates.length === 0) continue;
    const best = candidates.reduce((a, b) =>
      Math.abs(b.kickoffMs - f.kickoffMs) < Math.abs(a.kickoffMs - f.kickoffMs) ? b : a,
    );
    // require kickoff within 24h to avoid cross-edition collisions
    if (Math.abs(best.kickoffMs - f.kickoffMs) <= 24 * 3600_000) out.set(f.id, best);
  }
  return out;
}

/** Orient an ESPN match's goals to a fixture's home/away (in case ESPN home/away differs). */
export function orientGoals(
  fixture: Fixture,
  m: EspnMatch,
): { home: number | null; away: number | null } {
  if (m.home.fifaCode && m.home.fifaCode === fixture.home.fifaCode) {
    return { home: m.home.goals, away: m.away.goals };
  }
  if (m.home.fifaCode && m.home.fifaCode === fixture.away.fifaCode) {
    return { home: m.away.goals, away: m.home.goals }; // swapped
  }
  return { home: m.home.goals, away: m.away.goals };
}
