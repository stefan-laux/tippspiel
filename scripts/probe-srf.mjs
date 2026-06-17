// Throwaway probe: validates the SRF scraping approach against the LIVE site.
// Usage: node scripts/probe-srf.mjs
import * as cheerio from "cheerio";

const BASE = "https://wmtippspiel.srf.ch";
const COMMUNITY = "32216";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

function decode(s) {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function blocks($) {
  const out = [];
  $("[data-react-class]").each((_, el) => {
    const className = $(el).attr("data-react-class") ?? "";
    const raw = $(el).attr("data-react-props");
    if (!raw) return;
    let p;
    try { p = JSON.parse(raw); } catch { try { p = JSON.parse(decode(raw)); } catch { return; } }
    out.push({ className, props: p });
  });
  return out;
}

async function main() {
  // 1) Members
  const commHtml = await get(`${BASE}/communities/${COMMUNITY}`);
  const $c = cheerio.load(commHtml);
  const members = [];
  $c(".rankingItem--communityMember").each((_, el) => {
    const $el = $c(el);
    const $link = $el.find(".rankingItem__link").first();
    const slug = ($link.attr("href") ?? "").match(/\/users\/([^/?#]+)/)?.[1];
    if (slug) members.push({ slug, name: $link.text().trim(), admin: $el.find(".rankingItem__role").text().toLowerCase().includes("admin") });
  });
  console.log(`MEMBERS (${members.length}):`, JSON.stringify(members));

  if (!members.length) { console.log("!! no members parsed — selector may have changed"); return; }
  const slug = members[0].slug;

  // 2) Round names from a user page
  const r41 = await get(`${BASE}/users/${slug}/round/41`);
  const $u = cheerio.load(r41);
  const blks = blocks($u);
  const rw = blks.find((b) => /SelectRaceweek/i.test(b.className));
  const opts = rw?.props?.options ?? rw?.props?.raceweeks;
  console.log(`ROUNDS:`, JSON.stringify((opts ?? []).map((o) => ({ id: (o.url||"").match(/round\/(\d+)/)?.[1], name: o.name }))));

  // 3) Sample bets
  const bets = blks.filter((b) => b.props?.bet?.type === "score" || /ScoreBet/i.test(b.className)).map((b) => b.props.bet);
  console.log(`ROUND 41 SCOREBETS: ${bets.length}`);
  for (const bet of bets.slice(0, 3)) {
    console.log("  ", JSON.stringify({
      bet_id: bet.bet_id, state: bet.event_state, censored: bet.censored,
      teams: (bet.teams || []).map((t) => ({ id: t.id, name: t.name })),
      picks: bet.picks, final: bet.final_results, scores: bet.scores, total: bet.total_score,
      date: bet.event_date, loc: bet.meta_location,
    }));
  }

  // 4) Bonus (round 40)
  const r40 = await get(`${BASE}/users/${slug}/round/40`);
  const $b = cheerio.load(r40);
  const bonus = blocks($b).filter((b) => b.props?.bet?.type === "text_selection" || /TextSelection/i.test(b.className)).map((b) => b.props.bet);
  console.log(`BONUS QUESTIONS: ${bonus.length}`);
  for (const q of bonus) {
    console.log("  ", JSON.stringify({ bet_id: q.bet_id, name: q.event_name, q: q.question, pick: q.picks, censored: q.censored, options: (q.answers||[]).length }));
  }
}

main().catch((e) => { console.error("PROBE ERROR:", e.message); process.exit(1); });
