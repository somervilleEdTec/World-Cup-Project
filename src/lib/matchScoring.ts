import { scaledMatchPointsForStage } from './knockoutStageMultiplier';
import { ActualResult, Pick, Stage } from '../types';

const resultKey = (home: number, away: number): 'H' | 'A' | 'D' =>
  home > away ? 'H' : home < away ? 'A' : 'D';

export type PickAccuracy = 'exact' | 'result' | 'miss' | 'none';

/** Compares a prediction to the official result for comparison highlighting. */
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

/** Match-level points (+2/+4 base; QF 1.5×, SF 2×, final/third-place 3×). */
export function computeMatchPoints(
  pick: Pick | undefined,
  actual: ActualResult | undefined,
  stage: Stage = 'GROUP'
): number | null {
  if (!pick || !actual) return null;

  const correctResult =
    resultKey(pick.homeScore, pick.awayScore) === resultKey(actual.homeScore, actual.awayScore);
  const exactScore = pick.homeScore === actual.homeScore && pick.awayScore === actual.awayScore;
  if (!correctResult && !exactScore) return 0;

  return scaledMatchPointsForStage(stage, { correctResult, exactScore }).total;
}
