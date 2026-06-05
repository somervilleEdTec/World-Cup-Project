import { ActualResult, Pick } from '../types';

/** Default group-stage prediction when the user has not entered a score. */
export function defaultDrawPick(matchId: string): Pick {
  return { matchId, homeScore: 0, awayScore: 0 };
}

export function effectiveGroupPick(
  matchId: string,
  picks: Record<string, Pick | undefined>
): Pick {
  return picks[matchId] ?? defaultDrawPick(matchId);
}

export function picksFromActuals(actuals: Record<string, ActualResult>): Record<string, Pick> {
  return Object.fromEntries(
    Object.values(actuals).map((actual) => [
      actual.matchId,
      {
        matchId: actual.matchId,
        homeScore: actual.homeScore,
        awayScore: actual.awayScore,
        progressingTeamId: actual.progressingTeamId
      }
    ])
  );
}
