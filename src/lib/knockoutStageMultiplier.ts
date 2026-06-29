import type { Stage } from '../types';

const STAGE_LABELS: Partial<Record<Stage, string>> = {
  QF: 'Quarter-final',
  SF: 'Semi-final',
  FINAL: 'Final',
  THIRD_PLACE: 'Third-place play-off'
};

export function knockoutStageHeading(stage: Stage): string {
  if (stage === 'GROUP') return 'Group';
  const label = STAGE_LABELS[stage] ?? stage;
  const mult = knockoutStageMultiplierLabel(stage);
  return mult ? `${label} (${mult} match points)` : label;
}

export const BASE_RESULT_POINTS = 2;
export const BASE_EXACT_BONUS_POINTS = 4;

/** Knockout late-round multipliers; group and R32/R16 use 1×. */
export function knockoutStagePointsMultiplier(stage: Stage): number {
  switch (stage) {
    case 'QF':
      return 1.5;
    case 'SF':
    case 'THIRD_PLACE':
      return 2;
    case 'FINAL':
      return 3;
    default:
      return 1;
  }
}

/** User-facing label for knockout round scoring (empty for 1× stages). */
export function knockoutStageMultiplierLabel(stage: Stage): string | null {
  const mult = knockoutStagePointsMultiplier(stage);
  if (mult === 1) return null;
  return `${mult}×`;
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

/** Max match points available for a stage (result + exact bonus). */
export function maxMatchPointsForStage(stage: Stage): number {
  const mult = knockoutStagePointsMultiplier(stage);
  return Math.round((BASE_RESULT_POINTS + BASE_EXACT_BONUS_POINTS) * mult);
}
