import { groupMatches } from '../data/tournament';
import { buildKnockoutMatches } from './bracketEngine';
import { picksFromActuals } from './pickUtils';
import { ActualResult, Match } from '../types';

export function isGroupCompleteInResults(
  groupId: string,
  actuals: Record<string, ActualResult>
): boolean {
  const matches = groupMatches.filter((m) => m.group === groupId);
  return matches.length > 0 && matches.every((m) => actuals[m.id] !== undefined);
}

/** Knockout fixtures whose home and away are known from official results only. */
export function buildConfirmedKnockoutFixtures(actuals: Record<string, ActualResult>): Match[] {
  const officialPicks = picksFromActuals(actuals);
  return buildKnockoutMatches(officialPicks, actuals, { useFairPlay: true }).filter(
    (match) => match.homeTeamId !== 'tbd' && match.awayTeamId !== 'tbd'
  );
}

export function isKnockoutFixtureConfirmed(
  matchId: string,
  actuals: Record<string, ActualResult>
): boolean {
  return buildConfirmedKnockoutFixtures(actuals).some((match) => match.id === matchId);
}

export function assertKnockoutFixtureConfirmed(
  matchId: string,
  actuals: Record<string, ActualResult>
): void {
  if (!isKnockoutFixtureConfirmed(matchId, actuals)) {
    throw new Error(
      'This knockout fixture is not available yet. It unlocks once both teams are confirmed from official group or knockout results.'
    );
  }
}
