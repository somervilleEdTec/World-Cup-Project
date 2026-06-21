import { describe, expect, it } from 'vitest';
import { groupMatches } from '../data/tournament';
import {
  buildConfirmedKnockoutFixtures,
  isGroupCompleteInResults,
  isKnockoutFixtureConfirmed
} from '../lib/knockoutFixtureAvailability';
import { explainMappingFailure } from '../server/services/matchMapping';
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

  it('confirms an R32 fixture once its feeding groups have all official results', () => {
    const actuals: Record<string, ActualResult> = {};
    finishGroup('A', actuals);
    finishGroup('B', actuals);

    expect(isKnockoutFixtureConfirmed('r32-1', actuals)).toBe(true);
    expect(buildConfirmedKnockoutFixtures(actuals)).toEqual([
      expect.objectContaining({ id: 'r32-1', stage: 'R32' })
    ]);
  });

  it('confirms a later knockout fixture once feeder matches have FT results', () => {
    const actuals: Record<string, ActualResult> = {};
    'ABCDEFGHIJKL'.split('').forEach((groupId) => finishGroup(groupId, actuals));
    actuals['r32-1'] = { matchId: 'r32-1', homeScore: 2, awayScore: 0 };
    actuals['r32-3'] = { matchId: 'r32-3', homeScore: 1, awayScore: 0 };

    expect(isKnockoutFixtureConfirmed('r16-2', actuals)).toBe(true);
    expect(buildConfirmedKnockoutFixtures(actuals).some((m) => m.id === 'r16-2')).toBe(true);
  });
});

describe('match mapping with official results', () => {
  it('maps a confirmed R32 fixture from provider team names once bracket teams are known', () => {
    const actuals: Record<string, ActualResult> = {};
    finishGroup('A', actuals);
    finishGroup('B', actuals);

    expect(explainMappingFailure('Mexico', 'Canada', null, actuals)).toBe('mappable');
    expect(explainMappingFailure('Mexico', 'Canada', null, {})).toBe(
      'no_matching_internal_fixture'
    );
  });
});
