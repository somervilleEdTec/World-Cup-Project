import { describe, expect, it } from 'vitest';
import { groupMatches } from '../data/tournament';
import {
  buildConfirmedKnockoutFixtures,
  getKnockoutUnlockSummary,
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

  it('reports pending groups blocking third-place and direct R32 unlocks', () => {
    const actuals: Record<string, ActualResult> = {};
    finishGroup('A', actuals);
    finishGroup('B', actuals);
    finishGroup('C', actuals);
    finishGroup('F', actuals);
    finishGroup('E', actuals);
    finishGroup('I', actuals);
    finishGroup('K', actuals);
    finishGroup('L', actuals);
    finishGroup('D', actuals);
    finishGroup('G', actuals);
    finishGroup('H', actuals);
    // Group J missing all six results

    const summary = getKnockoutUnlockSummary(actuals);
    expect(summary.confirmedCount).toBe(6);
    expect(summary.pendingGroups).toEqual([
      expect.objectContaining({ groupId: 'J', played: 0, required: 6 })
    ]);
    expect(summary.thirdPlaceSlotsPending).toBe(true);
    expect(summary.blockedDirectR32MatchIds).toEqual(expect.arrayContaining(['r32-12', 'r32-14']));
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
