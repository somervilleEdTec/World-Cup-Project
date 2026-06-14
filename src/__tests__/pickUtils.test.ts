import { describe, expect, it } from 'vitest';
import { defaultDrawPick, defaultKnockoutDrawPick, effectiveGroupPick } from '../lib/pickUtils';

describe('pickUtils', () => {
  it('returns a 0-0 default pick for missing group scores', () => {
    expect(defaultDrawPick('g-a-1')).toEqual({
      matchId: 'g-a-1',
      homeScore: 0,
      awayScore: 0
    });
  });

  it('uses saved picks when present', () => {
    const saved = { matchId: 'g-a-1', homeScore: 2, awayScore: 1 };
    expect(effectiveGroupPick('g-a-1', { 'g-a-1': saved })).toEqual(saved);
  });

  it('returns a 0-0 draw with home team advancing for missing knockout scores', () => {
    expect(
      defaultKnockoutDrawPick({
        id: 'r32-1',
        stage: 'R32',
        kickoff: '2026-06-28T19:00:00.000Z',
        homeTeamId: 'mexico',
        awayTeamId: 'south-africa'
      })
    ).toEqual({
      matchId: 'r32-1',
      homeScore: 0,
      awayScore: 0,
      progressingTeamId: 'mexico'
    });
  });
});
