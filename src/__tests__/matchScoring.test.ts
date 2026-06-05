import { describe, expect, it } from 'vitest';
import { classifyPickAccuracy, computeMatchPoints } from '../lib/matchScoring';

describe('computeMatchPoints', () => {
  it('returns null without pick or actual', () => {
    expect(
      computeMatchPoints(undefined, { matchId: 'g-a-1', homeScore: 1, awayScore: 0 })
    ).toBeNull();
    expect(
      computeMatchPoints({ matchId: 'g-a-1', homeScore: 1, awayScore: 0 }, undefined)
    ).toBeNull();
  });

  it('awards 2 for correct result only', () => {
    expect(
      computeMatchPoints(
        { matchId: 'g-a-1', homeScore: 2, awayScore: 0 },
        { matchId: 'g-a-1', homeScore: 3, awayScore: 1 }
      )
    ).toBe(2);
  });

  it('awards 6 for exact score', () => {
    expect(
      computeMatchPoints(
        { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
        { matchId: 'g-a-1', homeScore: 2, awayScore: 1 }
      )
    ).toBe(6);
  });

  it('awards 0 for wrong result', () => {
    expect(
      computeMatchPoints(
        { matchId: 'g-a-1', homeScore: 0, awayScore: 1 },
        { matchId: 'g-a-1', homeScore: 2, awayScore: 0 }
      )
    ).toBe(0);
  });

  it('knockout result points use advancing team, not draw alone', () => {
    const match = {
      homeTeamId: 'mexico',
      awayTeamId: 'canada'
    };
    expect(
      computeMatchPoints(
        { matchId: 'r32-1', homeScore: 1, awayScore: 1, progressingTeamId: 'mexico' },
        { matchId: 'r32-1', homeScore: 1, awayScore: 1, progressingTeamId: 'canada' },
        'R32',
        match
      )
    ).toBe(4);
    expect(
      computeMatchPoints(
        { matchId: 'r32-1', homeScore: 1, awayScore: 1, progressingTeamId: 'mexico' },
        { matchId: 'r32-1', homeScore: 1, awayScore: 1, progressingTeamId: 'mexico' },
        'R32',
        match
      )
    ).toBe(6);
  });

  it('knockout base points use advancing team on different FT scorelines', () => {
    const match = {
      homeTeamId: 'mexico',
      awayTeamId: 'canada'
    };
    expect(
      computeMatchPoints(
        { matchId: 'r32-1', homeScore: 1, awayScore: 0 },
        { matchId: 'r32-1', homeScore: 2, awayScore: 0 },
        'R32',
        match
      )
    ).toBe(2);
    expect(
      computeMatchPoints(
        { matchId: 'r32-1', homeScore: 1, awayScore: 0 },
        { matchId: 'r32-1', homeScore: 0, awayScore: 1 },
        'R32',
        match
      )
    ).toBe(0);
  });

  it('knockout awards FT exact bonus even when advancer is wrong or missing', () => {
    const match = {
      homeTeamId: 'mexico',
      awayTeamId: 'canada'
    };
    expect(
      computeMatchPoints(
        { matchId: 'r32-1', homeScore: 1, awayScore: 1 },
        { matchId: 'r32-1', homeScore: 1, awayScore: 1, progressingTeamId: 'mexico' },
        'R32',
        match
      )
    ).toBe(4);
  });

  it('knockout without fixture teams awards exact FT bonus only', () => {
    expect(
      computeMatchPoints(
        { matchId: 'final', homeScore: 2, awayScore: 1 },
        { matchId: 'final', homeScore: 2, awayScore: 1 },
        'FINAL'
      )
    ).toBe(12);
  });
});

describe('classifyPickAccuracy', () => {
  it('classifies exact, result-only, and miss', () => {
    const actual = { matchId: 'g-a-1', homeScore: 2, awayScore: 1 };
    expect(classifyPickAccuracy({ matchId: 'g-a-1', homeScore: 2, awayScore: 1 }, actual)).toBe(
      'exact'
    );
    expect(classifyPickAccuracy({ matchId: 'g-a-1', homeScore: 3, awayScore: 0 }, actual)).toBe(
      'result'
    );
    expect(classifyPickAccuracy({ matchId: 'g-a-1', homeScore: 0, awayScore: 1 }, actual)).toBe(
      'miss'
    );
    expect(classifyPickAccuracy(undefined, actual)).toBe('none');
  });
});
