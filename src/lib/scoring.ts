// Pure scoring logic for the SRF WM-Tippspiel rules.
//
// Group phase:   5 outcome (win/draw, any goals) | 1 home goals | 1 away goals | 3 goal difference
// Knockout:     10 outcome                       | 2 home goals | 2 away goals | 6 goal difference
// Goal-difference points require the correct difference AND, for a non-draw, the correct winner.
//
// Bonus (Zusatzfragen): 50 for the correct World Champion, 20 for each other correct answer.
//
// These functions are pure and unit-tested against SRF's own `scores` breakdown captured from
// real ScoreBet blocks, so our numbers match the official site exactly.

import type { Outcome, PointsBreakdown } from "./types";
import { BONUS_CHAMPION_POINTS, BONUS_OTHER_POINTS } from "./config";

interface Weights {
  outcome: number;
  home: number;
  away: number;
  diff: number;
}

const GROUP_WEIGHTS: Weights = { outcome: 5, home: 1, away: 1, diff: 3 };
const KNOCKOUT_WEIGHTS: Weights = { outcome: 10, home: 2, away: 2, diff: 6 };

export function outcomeOf(home: number, away: number): Outcome {
  if (home > away) return "H";
  if (home < away) return "A";
  return "D";
}

const EMPTY: PointsBreakdown = { outcome: 0, home: 0, away: 0, diff: 0, total: 0 };

/**
 * Score a single prediction against an actual result.
 * @param isKnockout whether the match is in the knockout phase (changes the weights)
 * @param pred [predictedHome, predictedAway]
 * @param actual [actualHome, actualAway]
 */
export function scorePrediction(
  isKnockout: boolean,
  pred: [number, number],
  actual: [number, number],
): PointsBreakdown {
  const [ph, pa] = pred;
  const [ah, aa] = actual;
  if ([ph, pa, ah, aa].some((n) => n === null || n === undefined || Number.isNaN(n))) {
    return { ...EMPTY };
  }

  const w = isKnockout ? KNOCKOUT_WEIGHTS : GROUP_WEIGHTS;

  // Outcome: correct tendency (home win / draw / away win), regardless of exact goals.
  const outcome = outcomeOf(ph, pa) === outcomeOf(ah, aa) ? w.outcome : 0;

  // Exact home / away goal counts.
  const home = ph === ah ? w.home : 0;
  const away = pa === aa ? w.away : 0;

  // Goal difference: same magnitude AND (a draw, or same winner). This encodes
  // "Bei einem Sieg muss der getippte Sieger korrekt sein".
  const predDiff = ph - pa;
  const actDiff = ah - aa;
  let diff = 0;
  if (Math.abs(predDiff) === Math.abs(actDiff)) {
    if (actDiff === 0 || Math.sign(predDiff) === Math.sign(actDiff)) {
      diff = w.diff;
    }
  }

  return { outcome, home, away, diff, total: outcome + home + away + diff };
}

/** Convenience wrapper returning just the total. */
export function scoreTotal(
  isKnockout: boolean,
  pred: [number, number],
  actual: [number, number],
): number {
  return scorePrediction(isKnockout, pred, actual).total;
}

/** Points for one bonus answer (0 if unresolved or wrong). */
export function scoreBonus(
  isChampion: boolean,
  predictedAnswerId: string | null | undefined,
  correctAnswerId: string | null | undefined,
): number {
  if (!predictedAnswerId || !correctAnswerId) return 0;
  if (predictedAnswerId !== correctAnswerId) return 0;
  return isChampion ? BONUS_CHAMPION_POINTS : BONUS_OTHER_POINTS;
}
