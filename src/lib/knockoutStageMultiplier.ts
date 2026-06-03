import type { Stage } from '../types';

export const BASE_RESULT_POINTS = 2;
export const BASE_EXACT_BONUS_POINTS = 4;

/** Knockout late-round multipliers; group and R32/R16 use 1×. */
export function knockoutStagePointsMultiplier(stage: Stage): number {
  switch (stage) {
    case 'QF':
      return 1.5;
    case 'SF':
      return 2;
    case 'FINAL':
    case 'THIRD_PLACE':
      return 3;
    default:
      return 1;
  }
}

export function scaledMatchPointsForStage(
  stage: Stage,
  options: { correctResult: boolean; exactScore: boolean }
): { resultPoints: number; exactBonusPoints: number; total: number } {
  const mult = knockoutStagePointsMultiplier(stage);
  const resultPoints = options.correctResult ? Math.round(BASE_RESULT_POINTS * mult) : 0;
  const exactBonusPoints = options.exactScore ? Math.round(BASE_EXACT_BONUS_POINTS * mult) : 0;
  return { resultPoints, exactBonusPoints, total: resultPoints + exactBonusPoints };
}
