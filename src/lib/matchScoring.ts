import { scaledMatchPointsForStage } from './knockoutStageMultiplier';
import { ActualResult, Match, Pick as MatchPick, Stage } from '../types';

const resultKey = (home: number, away: number): 'H' | 'A' | 'D' =>
  home > away ? 'H' : home < away ? 'A' : 'D';

export type PickAccuracy = 'exact' | 'result' | 'miss' | 'none';

type FixtureTeams = Pick<Match, 'homeTeamId' | 'awayTeamId'>;
type ScoreLine = Pick<MatchPick, 'homeScore' | 'awayScore' | 'progressingTeamId'>;

function isKnockoutStage(stage: Stage): boolean {
  return stage !== 'GROUP';
}

/** Team that advances from a pick or official 90-minute result (ET/pens via progressingTeamId on draws). */
export function advancingTeamId(match: FixtureTeams, scores: ScoreLine): string | null {
  if (scores.homeScore > scores.awayScore) return match.homeTeamId;
  if (scores.awayScore > scores.homeScore) return match.awayTeamId;
  return scores.progressingTeamId ?? null;
}

export function evaluateMatchScoring(
  pick: MatchPick,
  actual: ActualResult,
  stage: Stage,
  match?: FixtureTeams
): { correctResult: boolean; exactScore: boolean } {
  const exactScore = pick.homeScore === actual.homeScore && pick.awayScore === actual.awayScore;

  if (isKnockoutStage(stage)) {
    if (!match) {
      // Knockout base points require fixture teams; never fall back to group W/D/L.
      return { correctResult: false, exactScore };
    }
    const predictedAdvancer = advancingTeamId(match, pick);
    const actualAdvancer = advancingTeamId(match, actual);
    const correctResult =
      predictedAdvancer !== null && actualAdvancer !== null && predictedAdvancer === actualAdvancer;
    return { correctResult, exactScore };
  }

  const correctResult =
    resultKey(pick.homeScore, pick.awayScore) === resultKey(actual.homeScore, actual.awayScore);
  return { correctResult, exactScore };
}

/** Compares a prediction to the official result for comparison highlighting. */
export function classifyPickAccuracy(
  pick: MatchPick | undefined,
  actual: ActualResult | undefined,
  options?: { stage?: Stage; match?: FixtureTeams }
): PickAccuracy {
  if (!pick || !actual) return 'none';

  const stage = options?.stage ?? 'GROUP';
  const { correctResult, exactScore } = evaluateMatchScoring(pick, actual, stage, options?.match);

  if (exactScore) return 'exact';
  if (correctResult) return 'result';
  return 'miss';
}

/** Match-level points (+2/+4 base; QF 1.5×, SF 2×, final/third-place 3×). */
export function computeMatchPoints(
  pick: MatchPick | undefined,
  actual: ActualResult | undefined,
  stage: Stage = 'GROUP',
  match?: FixtureTeams
): number | null {
  if (!pick || !actual) return null;

  const { correctResult, exactScore } = evaluateMatchScoring(pick, actual, stage, match);
  if (!correctResult && !exactScore) return 0;

  return scaledMatchPointsForStage(stage, { correctResult, exactScore }).total;
}
