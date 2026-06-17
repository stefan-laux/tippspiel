// Domain types. These are the plain, JSON-serializable shapes the UI works with.
// Firestore Timestamps are converted to epoch millis at the read/write boundary so that
// Server Components can pass them straight into Client Components without serialization errors.

export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED";

export interface TeamInfo {
  /** SRF's internal team id (from the logo url / teams[].id). */
  srfId: string;
  /** Display name as scraped from SRF (German). */
  name: string;
  /** FIFA 3-letter code if resolved (e.g. "RSA"); used as the stable team key. */
  fifaCode?: string;
  /** ISO2 country code (lowercase) if resolved; join key vs the football API. */
  iso2?: string;
  /** flagcdn SVG url if resolved. */
  flag?: string;
}

export interface Fixture {
  /** Stable fixture id = SRF bet_id. */
  id: string;
  round: number;
  stage: string;
  isKnockout: boolean;
  group?: string;
  kickoffMs: number;
  deadlineMs: number;
  status: MatchStatus;
  home: TeamInfo;
  away: TeamInfo;
  /** Final score once FINISHED (null while not finished). */
  finalHome: number | null;
  finalAway: number | null;
  location?: string;
  /** Football-API fixture id once mapped (for live polling / events). */
  apiFixtureId?: number | null;
  /** Set true once the kickoff scrape has run, so the dispatcher is idempotent. */
  scrapeDoneForKickoff?: boolean;
  pointsComputedAtMs?: number | null;
  updatedAtMs: number;
}

/** Small, hot doc updated by the live cron; clients subscribe to it for the live widget. */
export interface LiveState {
  fixtureId: string;
  isLive: boolean;
  /** Elapsed minutes played (football-API style), or null if unknown. */
  elapsed: number | null;
  /** Period code: 1H, HT, 2H, ET, BT, P, FT ... */
  period: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  updatedAtMs: number;
}

export type Outcome = "H" | "D" | "A";

export interface PointsBreakdown {
  outcome: number;
  home: number;
  away: number;
  diff: number;
  total: number;
}

export interface Tip {
  id: string; // `${fixtureId}__${userId}`
  fixtureId: string;
  round: number;
  userId: string;
  displayName: string;
  predHome: number;
  predAway: number;
  predOutcome: Outcome;
  /** Final points (only meaningful once the match is FINISHED). */
  points: PointsBreakdown | null;
  /** Provisional points vs the current live score (meaningful while LIVE). */
  livePoints: PointsBreakdown | null;
  scrapedAtMs: number;
}

export interface User {
  id: string; // SRF slug
  slug: string;
  displayName: string;
  isAdmin: boolean;
  /** Points from FINISHED matches only. */
  matchPoints: number;
  /** Points from resolved bonus questions. */
  bonusPoints: number;
  /** matchPoints + bonusPoints (the fixed leaderboard value). */
  totalPoints: number;
  /** Finished matches + provisional points from currently-live matches + bonus. */
  livePoints: number;
  rank: number;
  liveRank: number;
  updatedAtMs: number;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  rank: number;
  points: number;
  matchPoints?: number;
  bonusPoints?: number;
  /** For the live board: difference vs the fixed/overall points. */
  delta?: number;
}

export interface Leaderboard {
  id: "overall" | "live";
  computedAtMs: number;
  entries: LeaderboardEntry[];
}

export interface MatchLeaderboardEntry {
  userId: string;
  displayName: string;
  predHome: number;
  predAway: number;
  points: number;
  breakdown: PointsBreakdown;
}

export interface MatchLeaderboard {
  fixtureId: string;
  status: MatchStatus;
  computedAtMs: number;
  /** For live boards: current score context. */
  elapsed?: number | null;
  period?: string | null;
  homeGoals?: number | null;
  awayGoals?: number | null;
  entries: MatchLeaderboardEntry[];
}

export type BonusType = "champion" | "other";

export interface BonusOption {
  id: string;
  name: string;
}

export interface BonusQuestion {
  id: string; // SRF bet_id
  order: number;
  question: string;
  type: BonusType;
  points: number;
  options: BonusOption[];
  correctAnswerId: string | null;
  correctAnswerName: string | null;
  resolved: boolean;
  updatedAtMs: number;
}

export interface BonusAnswer {
  id: string; // `${questionId}__${userId}`
  questionId: string;
  userId: string;
  displayName: string;
  answerId: string;
  answerName: string;
  awarded: boolean;
  pointsAwarded: number;
}

export interface CommunityMeta {
  id: string;
  name: string;
  url: string;
  memberCount: number;
  lastSyncAtMs: number;
  /** Map of round id -> SRF round name, harvested from SelectRaceweek. */
  roundNames?: Record<string, string>;
}
