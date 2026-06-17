import "server-only";
import {
  fetchCommunityMembers,
  fetchUserRound,
  sleep,
  type ScrapedScoreBet,
  type ScrapedMember,
  type ScrapedUserRound,
} from "@/lib/srf/scraper";
import {
  getCommunityConfig,
  FIRST_MATCH_ROUND,
  LAST_MATCH_ROUND,
  BONUS_ROUND,
  isKnockoutRound,
  ROUND_STAGE_LABEL,
  BONUS_CHAMPION_POINTS,
  BONUS_OTHER_POINTS,
} from "@/lib/config";
import { scorePrediction, scoreBonus, outcomeOf } from "@/lib/scoring";
import { mapLimit, groupBy } from "@/lib/util";
import { bonusAnswerId, tipId } from "@/lib/firebase/collections";
import {
  fetchEspnScoreboard,
  matchEspnToFixtures,
  orientGoals,
  type EspnMatch,
} from "@/lib/live/espn";
import {
  getAllTips,
  getBonusAnswers,
  getFixtures,
  getUsers,
} from "@/lib/data";
import {
  writeFixtures,
  writeTips,
  writeUsers,
  writeBonusQuestions,
  writeBonusAnswers,
  writeMatchLeaderboards,
  writeLiveMatchLeaderboards,
  writeLiveStates,
  writeLeaderboard,
  writeCommunityMeta,
  writeHealth,
} from "@/lib/sync/store";
import type {
  Fixture,
  Tip,
  User,
  Leaderboard,
  MatchLeaderboard,
  LiveState,
  BonusQuestion,
  BonusAnswer,
  PointsBreakdown,
} from "@/lib/types";

const POLITE_DELAY_MS = 250;
const SCRAPE_CONCURRENCY = 4;
const EMPTY_BREAKDOWN: PointsBreakdown = { outcome: 0, home: 0, away: 0, diff: 0, total: 0 };

export interface LiveScore {
  home: number;
  away: number;
  elapsed: number | null;
  period: string | null;
}

// --- pure builders ------------------------------------------------------------

function betToFixture(bet: ScrapedScoreBet, roundNames: Record<string, string>, now: number): Fixture {
  const knockout = isKnockoutRound(bet.round);
  const stage = roundNames[String(bet.round)] || ROUND_STAGE_LABEL[bet.round] || `Runde ${bet.round}`;
  const final = bet.status === "FINISHED" ? bet.finalResults : null;
  return {
    id: bet.betId,
    round: bet.round,
    stage,
    isKnockout: knockout,
    kickoffMs: bet.eventDateMs,
    deadlineMs: bet.deadlineMs,
    status: bet.status,
    home: bet.home,
    away: bet.away,
    finalHome: final ? final[0] : null,
    finalAway: final ? final[1] : null,
    location: bet.location,
    scrapeDoneForKickoff: bet.status !== "SCHEDULED",
    updatedAtMs: now,
  };
}

function betToTip(bet: ScrapedScoreBet, member: ScrapedMember, now: number): Tip {
  const [ph, pa] = bet.picks!;
  return {
    id: tipId(bet.betId, member.slug),
    fixtureId: bet.betId,
    round: bet.round,
    userId: member.slug,
    displayName: member.displayName,
    predHome: ph,
    predAway: pa,
    predOutcome: outcomeOf(ph, pa),
    points: null,
    livePoints: null,
    scrapedAtMs: now,
  };
}

function buildMatchBoard(
  f: Fixture,
  ftips: Tip[],
  mode: "final" | "live",
  ls?: LiveScore,
  now = Date.now(),
): MatchLeaderboard {
  const entries = ftips
    .map((t) => {
      const pb = (mode === "final" ? t.points : t.livePoints) ?? EMPTY_BREAKDOWN;
      return {
        userId: t.userId,
        displayName: t.displayName,
        predHome: t.predHome,
        predAway: t.predAway,
        points: pb.total,
        breakdown: pb,
      };
    })
    .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));
  return {
    fixtureId: f.id,
    status: mode === "final" ? "FINISHED" : "LIVE",
    computedAtMs: now,
    elapsed: ls?.elapsed ?? null,
    period: ls?.period ?? null,
    homeGoals: ls ? ls.home : f.finalHome,
    awayGoals: ls ? ls.away : f.finalAway,
    entries,
  };
}

function assignRanks<T>(items: T[], score: (t: T) => number): { item: T; rank: number }[] {
  const sorted = [...items].sort((a, b) => score(b) - score(a));
  let lastScore: number | null = null;
  let lastRank = 0;
  return sorted.map((item, i) => {
    const s = score(item);
    const rank = s === lastScore ? lastRank : i + 1;
    lastScore = s;
    lastRank = rank;
    return { item, rank };
  });
}

export interface ComputeOutput {
  tips: Tip[];
  users: User[];
  overall: Leaderboard;
  live: Leaderboard;
  matchBoards: MatchLeaderboard[];
  liveMatchBoards: MatchLeaderboard[];
  liveStates: LiveState[];
}

/**
 * Pure-ish compute: scores every tip, builds per-match boards, user aggregates and the
 * overall + live leaderboards. `liveScores` supplies current scores for in-progress
 * fixtures (from ESPN, or SRF as a baseline).
 */
export function computeEverything(
  fixtures: Fixture[],
  tips: Tip[],
  bonusAnswers: BonusAnswer[],
  userBase: { id: string; displayName: string; isAdmin: boolean }[],
  liveScores: Map<string, LiveScore>,
  now: number,
): ComputeOutput {
  const fixturesById = new Map(fixtures.map((f) => [f.id, f]));
  const tipsByFixture = groupBy(tips, (t) => t.fixtureId);

  // 1) score tips
  for (const f of fixtures) {
    const ftips = tipsByFixture.get(f.id) ?? [];
    if (f.status === "FINISHED" && f.finalHome != null && f.finalAway != null) {
      for (const t of ftips) {
        t.points = scorePrediction(f.isKnockout, [t.predHome, t.predAway], [f.finalHome, f.finalAway]);
      }
    }
    const ls = liveScores.get(f.id);
    if (ls) {
      for (const t of ftips) {
        t.livePoints = scorePrediction(f.isKnockout, [t.predHome, t.predAway], [ls.home, ls.away]);
      }
    }
  }

  // 2) per-match boards
  const matchBoards: MatchLeaderboard[] = [];
  for (const f of fixtures) {
    if (f.status === "FINISHED" && f.finalHome != null && f.finalAway != null) {
      matchBoards.push(buildMatchBoard(f, tipsByFixture.get(f.id) ?? [], "final", undefined, now));
    }
  }
  const liveMatchBoards: MatchLeaderboard[] = [];
  for (const [fid, ls] of liveScores) {
    const f = fixturesById.get(fid);
    if (f) liveMatchBoards.push(buildMatchBoard(f, tipsByFixture.get(fid) ?? [], "live", ls, now));
  }

  // 3) aggregates per user
  const tipsByUser = groupBy(tips, (t) => t.userId);
  const bonusByUser = groupBy(bonusAnswers, (a) => a.userId);
  const liveFixtureIds = new Set(liveScores.keys());

  const users: User[] = userBase.map((ub) => {
    const ut = tipsByUser.get(ub.id) ?? [];
    const matchPoints = ut.reduce((s, t) => s + (t.points?.total ?? 0), 0);
    const bonusPoints = (bonusByUser.get(ub.id) ?? []).reduce((s, a) => s + a.pointsAwarded, 0);
    const totalPoints = matchPoints + bonusPoints;
    const liveDelta = ut.reduce(
      (s, t) => s + (liveFixtureIds.has(t.fixtureId) ? t.livePoints?.total ?? 0 : 0),
      0,
    );
    return {
      id: ub.id,
      slug: ub.id,
      displayName: ub.displayName,
      isAdmin: ub.isAdmin,
      matchPoints,
      bonusPoints,
      totalPoints,
      livePoints: totalPoints + liveDelta,
      rank: 0,
      liveRank: 0,
      updatedAtMs: now,
    };
  });

  for (const { item, rank } of assignRanks(users, (u) => u.totalPoints)) item.rank = rank;
  for (const { item, rank } of assignRanks(users, (u) => u.livePoints)) item.liveRank = rank;

  const overall: Leaderboard = {
    id: "overall",
    computedAtMs: now,
    entries: [...users]
      .sort((a, b) => a.rank - b.rank)
      .map((u) => ({
        userId: u.id,
        displayName: u.displayName,
        rank: u.rank,
        points: u.totalPoints,
        matchPoints: u.matchPoints,
        bonusPoints: u.bonusPoints,
      })),
  };

  const live: Leaderboard = {
    id: "live",
    computedAtMs: now,
    entries: [...users]
      .sort((a, b) => a.liveRank - b.liveRank)
      .map((u) => ({
        userId: u.id,
        displayName: u.displayName,
        rank: u.liveRank,
        points: u.livePoints,
        delta: u.livePoints - u.totalPoints,
      })),
  };

  const liveStates: LiveState[] = [...liveScores.entries()].map(([fixtureId, ls]) => ({
    fixtureId,
    isLive: true,
    elapsed: ls.elapsed,
    period: ls.period,
    homeGoals: ls.home,
    awayGoals: ls.away,
    updatedAtMs: now,
  }));

  return { tips, users, overall, live, matchBoards, liveMatchBoards, liveStates };
}

// --- bonus --------------------------------------------------------------------

function optionName(q: BonusQuestion, id: string | null): string | null {
  if (!id) return null;
  return q.options.find((o) => o.id === id)?.name ?? id;
}

function buildBonus(
  members: ScrapedMember[],
  bonusPages: Map<string, ScrapedUserRound>,
  now: number,
): { bonusQuestions: BonusQuestion[]; bonusAnswers: BonusAnswer[] } {
  const questions = new Map<string, BonusQuestion>();
  const correctByQ = new Map<string, string>();

  for (const m of members) {
    const page = bonusPages.get(m.slug);
    if (!page) continue;
    for (const q of page.bonus) {
      if (!q.betId) continue;
      if (!questions.has(q.betId)) {
        questions.set(q.betId, {
          id: q.betId,
          order: q.order,
          question: q.question,
          type: q.isChampion ? "champion" : "other",
          points: q.isChampion ? BONUS_CHAMPION_POINTS : BONUS_OTHER_POINTS,
          options: q.options,
          correctAnswerId: null,
          correctAnswerName: null,
          resolved: false,
          updatedAtMs: now,
        });
      }
      // Infer the correct answer: whoever scored > 0 on this question picked correctly.
      if (q.pick != null && q.srfTotalScore != null && q.srfTotalScore > 0) {
        correctByQ.set(q.betId, q.pick);
      }
    }
  }

  for (const [betId, q] of questions) {
    const correct = correctByQ.get(betId) ?? null;
    q.correctAnswerId = correct;
    q.correctAnswerName = optionName(q, correct);
    q.resolved = correct != null;
  }

  const bonusAnswers: BonusAnswer[] = [];
  for (const m of members) {
    const page = bonusPages.get(m.slug);
    if (!page) continue;
    for (const q of page.bonus) {
      if (!q.betId || q.pick == null) continue;
      const qq = questions.get(q.betId)!;
      const pts = scoreBonus(qq.type === "champion", q.pick, qq.correctAnswerId);
      bonusAnswers.push({
        id: bonusAnswerId(q.betId, m.slug),
        questionId: q.betId,
        userId: m.slug,
        displayName: m.displayName,
        answerId: q.pick,
        answerName: optionName(qq, q.pick) ?? q.pick,
        awarded: pts > 0,
        pointsAwarded: pts,
      });
    }
  }

  return { bonusQuestions: [...questions.values()], bonusAnswers };
}

// --- full sync ----------------------------------------------------------------

export interface SyncResult {
  members: number;
  fixtures: number;
  tips: number;
  bonusQuestions: number;
  startedRounds: number[];
  durationMs: number;
}

export interface ScrapeComputeResult {
  now: number;
  members: ScrapedMember[];
  roundNames: Record<string, string>;
  startedRounds: number[];
  fixtures: Fixture[];
  tips: Tip[];
  bonusQuestions: BonusQuestion[];
  bonusAnswers: BonusAnswer[];
  liveScores: Map<string, LiveScore>;
  compute: ComputeOutput;
  communityId: string;
  url: string;
}

/** Scrape SRF + compute everything, WITHOUT writing to Firestore (used by fullSync + dry-run). */
export async function scrapeAndCompute(): Promise<ScrapeComputeResult> {
  const now = Date.now();
  const cfg = getCommunityConfig();
  const members = await fetchCommunityMembers();
  if (members.length === 0) throw new Error("No community members found — check SRF_COMMUNITY_URL");
  const sourceSlug = members[0].slug;

  // 1) fixtures + round names from the source member across all match rounds
  const roundNames: Record<string, string> = {};
  const sourceRounds = new Map<number, ScrapedUserRound>();
  const fixturesById = new Map<string, Fixture>();
  for (let r = FIRST_MATCH_ROUND; r <= LAST_MATCH_ROUND; r++) {
    const page = await fetchUserRound(sourceSlug, r);
    sourceRounds.set(r, page);
    for (const ri of page.rounds) roundNames[String(ri.id)] = ri.name;
    for (const bet of page.bets) {
      if (!bet.betId) continue;
      fixturesById.set(bet.betId, betToFixture(bet, roundNames, now));
    }
    await sleep(POLITE_DELAY_MS);
  }
  const fixtures = [...fixturesById.values()];

  // rounds that have at least one revealed (non-censored) bet -> tips are visible
  const startedRounds: number[] = [];
  for (let r = FIRST_MATCH_ROUND; r <= LAST_MATCH_ROUND; r++) {
    const page = sourceRounds.get(r);
    if (page && page.bets.some((b) => !b.censored)) startedRounds.push(r);
  }

  // 2) tips: every member across the started rounds
  const tips: Tip[] = [];
  await mapLimit(members, SCRAPE_CONCURRENCY, async (m) => {
    for (const r of startedRounds) {
      try {
        const page =
          m.slug === sourceSlug ? sourceRounds.get(r)! : await fetchUserRound(m.slug, r);
        for (const bet of page.bets) {
          if (!bet.betId || bet.picks == null) continue;
          tips.push(betToTip(bet, m, now));
        }
      } catch (err) {
        // One member/round failure must not abort the whole sync — skip and continue.
        console.error(`[sync] tips fetch failed for ${m.slug} round ${r}:`, err);
      }
      if (m.slug !== sourceSlug) await sleep(POLITE_DELAY_MS);
    }
  });

  // 3) bonus: round 40 for every member
  const bonusPages = new Map<string, ScrapedUserRound>();
  await mapLimit(members, SCRAPE_CONCURRENCY, async (m) => {
    try {
      bonusPages.set(m.slug, await fetchUserRound(m.slug, BONUS_ROUND));
    } catch (err) {
      console.error(`[sync] bonus fetch failed for ${m.slug}:`, err);
    }
    await sleep(POLITE_DELAY_MS);
  });
  const { bonusQuestions, bonusAnswers } = buildBonus(members, bonusPages, now);

  // 4) live baseline from SRF: matches in progress that already expose a current score
  const liveScores = new Map<string, LiveScore>();
  for (const page of sourceRounds.values()) {
    for (const bet of page.bets) {
      if (bet.status === "LIVE" && bet.finalResults) {
        liveScores.set(bet.betId, {
          home: bet.finalResults[0],
          away: bet.finalResults[1],
          elapsed: null,
          period: "LIVE",
        });
      }
    }
  }

  // 5) compute everything
  const userBase = members.map((m) => ({ id: m.slug, displayName: m.displayName, isAdmin: m.isAdmin }));
  const out = computeEverything(fixtures, tips, bonusAnswers, userBase, liveScores, now);

  return {
    now,
    members,
    roundNames,
    startedRounds,
    fixtures,
    tips: out.tips,
    bonusQuestions,
    bonusAnswers,
    liveScores,
    compute: out,
    communityId: cfg.communityId,
    url: cfg.url,
  };
}

export async function fullSync(): Promise<SyncResult> {
  const r = await scrapeAndCompute();
  const { now, members, fixtures, tips, bonusQuestions, bonusAnswers, compute: out, roundNames } = r;

  // persist
  await writeFixtures(fixtures);
  await writeTips(out.tips);
  await writeBonusQuestions(bonusQuestions);
  await writeBonusAnswers(bonusAnswers);
  await writeUsers(out.users);
  await writeMatchLeaderboards(out.matchBoards);
  await writeLiveMatchLeaderboards(out.liveMatchBoards);
  await writeLiveStates(out.liveStates);
  await writeLeaderboard(out.overall);
  await writeLeaderboard(out.live);
  await writeCommunityMeta({
    id: r.communityId,
    name: `Community ${r.communityId}`,
    url: r.url,
    memberCount: members.length,
    lastSyncAtMs: now,
    roundNames,
  });
  await writeHealth({ lastFullSyncAtMs: now, lastFullSyncMembers: members.length });

  return {
    members: members.length,
    fixtures: fixtures.length,
    tips: tips.length,
    bonusQuestions: bonusQuestions.length,
    startedRounds: r.startedRounds,
    durationMs: Date.now() - now,
  };
}

// --- live tick ----------------------------------------------------------------

export interface LiveResult {
  liveFixtures: number;
  ranFullSync: boolean;
  espnMatches: number;
}

/**
 * Frequent live update: poll ESPN, refresh live state/boards/leaderboard. Triggers a
 * full sync when a match has just kicked off (to scrape newly-revealed tips) or just
 * finished per ESPN (to pull SRF's final result and finalize points).
 */
export async function liveTick(): Promise<LiveResult> {
  const now = Date.now();
  const espn = await fetchEspnScoreboard();
  let fixtures = await getFixtures();
  let espnByFixture = matchEspnToFixtures(fixtures, espn);

  const needFullSync = fixtures.some((f) => {
    const m = espnByFixture.get(f.id);
    const kickedOff = f.kickoffMs > 0 && f.kickoffMs <= now;
    const justStarted = f.status === "SCHEDULED" && kickedOff && !f.scrapeDoneForKickoff;
    const justFinished = m?.state === "post" && f.status !== "FINISHED" && kickedOff;
    const espnLiveButScheduled = m?.state === "in" && f.status === "SCHEDULED";
    return justStarted || justFinished || espnLiveButScheduled;
  });

  let ranFullSync = false;
  if (needFullSync) {
    await fullSync();
    ranFullSync = true;
    fixtures = await getFixtures();
    espnByFixture = matchEspnToFixtures(fixtures, espn);
  }

  // Build live scores from ESPN in-progress matches; clear state for finished ones.
  const liveScores = new Map<string, LiveScore>();
  const liveFixtures: Fixture[] = [];
  const clearedStates: LiveState[] = [];
  for (const f of fixtures) {
    const m = espnByFixture.get(f.id);
    if (m && m.state === "in") {
      const g = orientGoals(f, m);
      if (g.home == null || g.away == null) continue;
      liveScores.set(f.id, {
        home: g.home,
        away: g.away,
        elapsed: m.elapsed,
        period: m.detail || "LIVE",
      });
      if (f.status !== "LIVE") {
        f.status = "LIVE";
        f.updatedAtMs = now;
        liveFixtures.push(f);
      }
    } else if (m && m.state === "post") {
      const g = orientGoals(f, m);
      // ESPN reports the final before SRF marks it FINISHED. Keep crediting these points
      // (so they don't vanish from the leaderboards) until SRF catches up via fullSync.
      if (f.status !== "FINISHED" && g.home != null && g.away != null) {
        liveScores.set(f.id, { home: g.home, away: g.away, elapsed: null, period: m.detail || "FT" });
      }
      // Turn the live widget off (isLive:false is written last, so it wins the merge).
      clearedStates.push({
        fixtureId: f.id,
        isLive: false,
        elapsed: null,
        period: m.detail || "FT",
        homeGoals: g.home ?? f.finalHome,
        awayGoals: g.away ?? f.finalAway,
        updatedAtMs: now,
      });
    }
  }

  // Nothing live and nothing just-finished -> only beat the health heartbeat (no writes).
  if (liveScores.size === 0 && clearedStates.length === 0) {
    await writeHealth({ lastLiveTickAtMs: now, liveFixtures: 0 });
    return { liveFixtures: 0, ranFullSync, espnMatches: espn.length };
  }

  const tips = await getAllTips();
  const bonusAnswers = await getBonusAnswers();
  const users = await getUsers();
  const userBase = users.map((u) => ({ id: u.id, displayName: u.displayName, isAdmin: u.isAdmin }));

  const out = computeEverything(fixtures, tips, bonusAnswers, userBase, liveScores, now);

  // Persist only the live-affected docs. User docs and the overall board are owned by
  // fullSync; the UI reads the leaderboards/live doc, so we don't rewrite every user here.
  const liveTips = out.tips.filter((t) => liveScores.has(t.fixtureId));
  if (liveFixtures.length) await writeFixtures(liveFixtures);
  if (liveTips.length) await writeTips(liveTips);
  await writeLiveStates([...out.liveStates, ...clearedStates]);
  if (out.liveMatchBoards.length) await writeLiveMatchLeaderboards(out.liveMatchBoards);
  await writeLeaderboard(out.live);
  await writeHealth({ lastLiveTickAtMs: now, liveFixtures: liveScores.size });

  return { liveFixtures: liveScores.size, ranFullSync, espnMatches: espn.length };
}
