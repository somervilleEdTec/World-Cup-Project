import { describe, expect, it } from 'vitest';
import { computeMatchPoints } from '../lib/matchScoring';

describe('computeMatchPoints', () => {
  it('returns null without pick or actual', () => {
    expect(computeMatchPoints(undefined, { matchId: 'g-a-1', homeScore: 1, awayScore: 0 })).toBeNull();
    expect(computeMatchPoints({ matchId: 'g-a-1', homeScore: 1, awayScore: 0 }, undefined)).toBeNull();
  });

  it('awards 1 for correct result only', () => {
    expect(
      computeMatchPoints(
        { matchId: 'g-a-1', homeScore: 2, awayScore: 0 },
        { matchId: 'g-a-1', homeScore: 3, awayScore: 1 }
      )
    ).toBe(1);
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
});
