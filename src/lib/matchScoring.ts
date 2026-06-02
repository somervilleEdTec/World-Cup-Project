import { ActualResult, Pick } from '../types';

const resultKey = (home: number, away: number): 'H' | 'A' | 'D' =>
  home > away ? 'H' : home < away ? 'A' : 'D';

export type PickAccuracy = 'exact' | 'result' | 'miss' | 'none';

/** Compares a committed pick to the official result for comparison highlighting. */
export function classifyPickAccuracy(
  pick: Pick | undefined,
  actual: ActualResult | undefined
): PickAccuracy {
  if (!pick || !actual) return 'none';
  if (pick.homeScore === actual.homeScore && pick.awayScore === actual.awayScore) {
    return 'exact';
  }
  if (resultKey(pick.homeScore, pick.awayScore) === resultKey(actual.homeScore, actual.awayScore)) {
    return 'result';
  }
  return 'miss';
}

/** Match-level points only (+1 result, +5 exact). Group position bonus is not per fixture. */
export function computeMatchPoints(
  pick: Pick | undefined,
  actual: ActualResult | undefined
): number | null {
  if (!pick || !actual) return null;

  let points = 0;
  if (resultKey(pick.homeScore, pick.awayScore) === resultKey(actual.homeScore, actual.awayScore)) {
    points += 1;
  }
  if (pick.homeScore === actual.homeScore && pick.awayScore === actual.awayScore) {
    points += 5;
  }
  return points;
}
