import { ActualResult, Pick } from '../types';

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
