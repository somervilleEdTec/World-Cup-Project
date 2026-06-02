import { describe, expect, it } from 'vitest';
import { groupMatches } from '../data/tournament';
import {
  buildConfirmedKnockoutFixtures,
  isGroupCompleteInResults,
  isKnockoutFixtureConfirmed
} from '../lib/knockoutFixtureAvailability';
import { ActualResult } from '../types';

function finishGroup(groupId: string, actuals: Record<string, ActualResult>) {
  groupMatches
    .filter((m) => m.group === groupId)
    .forEach((m) => {
      actuals[m.id] = {
        matchId: m.id,
        homeScore: 1,
        awayScore: 0,
        progressingTeamId: m.homeTeamId
      };
    });
}

describe('knockoutFixtureAvailability', () => {
  it('treats a group as complete only when all six results exist', () => {
    const actuals: Record<string, ActualResult> = {};
    expect(isGroupCompleteInResults('A', actuals)).toBe(false);
    finishGroup('A', actuals);
    expect(isGroupCompleteInResults('A', actuals)).toBe(true);
    expect(isGroupCompleteInResults('B', actuals)).toBe(false);
  });

  it('does not confirm knockout fixtures from predictions alone', () => {
    expect(buildConfirmedKnockoutFixtures({})).toHaveLength(0);
    expect(isKnockoutFixtureConfirmed('r32-1', {})).toBe(false);
  });

  it('confirms R32 fixtures once all feeding groups have official results', () => {
    const actuals: Record<string, ActualResult> = {};
    'ABCDEFGHIJKL'.split('').forEach((groupId) => finishGroup(groupId, actuals));
    const confirmed = buildConfirmedKnockoutFixtures(actuals);
    expect(confirmed.length).toBeGreaterThan(0);
    expect(confirmed.some((m) => m.id === 'r32-1')).toBe(true);
    expect(isKnockoutFixtureConfirmed('r32-1', actuals)).toBe(true);
  });
});
