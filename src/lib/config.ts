// Central configuration derived from environment variables.
// The SRF community URL is the one knob you set to point the app at a different community.

const DEFAULT_COMMUNITY_URL = "https://wmtippspiel.srf.ch/communities/32216";

export interface CommunityConfig {
  /** Full URL, e.g. https://wmtippspiel.srf.ch/communities/32216 */
  url: string;
  /** Origin, e.g. https://wmtippspiel.srf.ch */
  baseUrl: string;
  /** Numeric community id, e.g. "32216" */
  communityId: string;
}

export function getCommunityConfig(): CommunityConfig {
  const url = process.env.SRF_COMMUNITY_URL || DEFAULT_COMMUNITY_URL;
  let baseUrl = "https://wmtippspiel.srf.ch";
  let communityId = "";
  try {
    const u = new URL(url);
    baseUrl = u.origin;
    const m = u.pathname.match(/communities\/(\d+)/);
    communityId = m?.[1] ?? "";
  } catch {
    /* fall back to defaults below */
  }
  if (!communityId) {
    const m = DEFAULT_COMMUNITY_URL.match(/communities\/(\d+)/);
    communityId = m?.[1] ?? "32216";
  }
  return { url, baseUrl, communityId };
}

/**
 * Round-id scheme on the SRF "Betty" platform:
 *   40 = Zusatzfragen (bonus), 41/42/43 = group matchdays, 44+ = knockout rounds.
 * A match is in the knockout phase (10/2/2/6 scoring) when its round id >= 44.
 */
export const BONUS_ROUND = 40;
export const FIRST_MATCH_ROUND = 41;
export const LAST_MATCH_ROUND = 49;
export const KNOCKOUT_ROUND_START = 44;

/** Human-readable stage label per round id (fallback if SRF round name is missing). */
export const ROUND_STAGE_LABEL: Record<number, string> = {
  41: "Gruppenphase – 1. Runde",
  42: "Gruppenphase – 2. Runde",
  43: "Gruppenphase – 3. Runde",
  44: "Sechzehntelfinal",
  45: "Achtelfinal",
  46: "Viertelfinal",
  47: "Halbfinal",
  48: "Spiel um Platz 3",
  49: "Final",
};

export function isKnockoutRound(round: number): boolean {
  return round >= KNOCKOUT_ROUND_START;
}

/** Points config. */
export const BONUS_CHAMPION_POINTS = 50;
export const BONUS_OTHER_POINTS = 20;

/** A Zusatzfrage is the "world champion" question if its text mentions Weltmeister. */
export function isChampionQuestion(text: string): boolean {
  return /weltmeister/i.test(text);
}

export function getCronSecret(): string {
  return process.env.CRON_SECRET || "";
}

/** Optional: a free JSON live feed (e.g. a GitHub raw URL) used as the no-cap live source. */
export function getLiveFeedUrl(): string | undefined {
  return process.env.LIVE_FEED_URL || undefined;
}

export function getFootballApiKey(): string | undefined {
  return process.env.FOOTBALL_API_KEY || undefined;
}
