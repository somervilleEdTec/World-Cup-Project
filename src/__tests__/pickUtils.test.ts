import { describe, expect, it } from 'vitest';
import { defaultDrawPick, effectiveGroupPick } from '../lib/pickUtils';

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
});
