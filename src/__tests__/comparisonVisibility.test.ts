import { describe, expect, it } from 'vitest';
import {
  canViewOthersPicks,
  getNextUpcomingMatchId,
  isUpcomingFixture
} from '../lib/comparisonVisibility';
import { Match } from '../types';

describe('comparison visibility', () => {
  const groupMatch: Match = {
    id: 'g-a-1',
    stage: 'GROUP',
    group: 'A',
    kickoff: '2026-06-12T18:00:00Z',
    homeTeamId: 'mexico',
    awayTeamId: 'south-africa'
  };

  const koMatch: Match = {
    id: 'r32-1',
    stage: 'R32',
    kickoff: '2026-06-28T16:00:00Z',
    homeTeamId: 'mexico',
    awayTeamId: 'switzerland'
  };

  it('hides group picks from others before first kickoff', () => {
    expect(canViewOthersPicks(groupMatch, '2026-06-11T18:00:00Z')).toBe(false);
    expect(canViewOthersPicks(groupMatch, '2026-06-11T19:30:00Z')).toBe(true);
  });

  it('shows group picks when tournament group phase is locked in DB', () => {
    expect(canViewOthersPicks(groupMatch, '2026-06-01T00:00:00Z', true)).toBe(true);
  });

  it('hides knockout predictions from others until fixture kickoff', () => {
    expect(canViewOthersPicks(koMatch, '2026-06-27T12:00:00Z')).toBe(false);
    expect(canViewOthersPicks(koMatch, '2026-06-28T17:00:00Z')).toBe(true);
  });

  it('treats fixture as upcoming when kickoff has not passed and no result', () => {
    expect(isUpcomingFixture(groupMatch, '2026-06-11T18:00:00Z', {})).toBe(true);
    expect(isUpcomingFixture(groupMatch, '2026-06-12T19:00:00Z', {})).toBe(false);
    expect(
      isUpcomingFixture(groupMatch, '2026-06-11T18:00:00Z', {
        'g-a-1': { matchId: 'g-a-1', homeScore: 1, awayScore: 0 }
      })
    ).toBe(false);
  });

  it('selects earliest upcoming match', () => {
    const id = getNextUpcomingMatchId('2026-06-11T18:00:00Z', [
      { id: 'late', kickoff: '2026-06-20T18:00:00Z' },
      { id: 'next', kickoff: '2026-06-11T19:00:00Z' }
    ]);
    expect(id).toBe('next');
  });
});
