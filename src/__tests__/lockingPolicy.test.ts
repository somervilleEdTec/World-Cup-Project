import { describe, expect, it } from 'vitest';
import { canViewOthersPicks } from '../lib/comparisonVisibility';
import { isKnockoutFixtureLocked, isMatchEditable } from '../lib/pickLocks';
import { Match } from '../types';

/**
 * Documents owner-resolved locking policy (see docs/LOCKING.md).
 * Keeps comparison visibility and edit locks aligned with FINAL_PLAN + implementation notes.
 */

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

describe('locking policy (LOCKING.md)', () => {
  it('does not lock group-stage edits from a single official result before global kickoff', () => {
    const actual = { matchId: 'g-a-1', homeScore: 2, awayScore: 1 };
    expect(isMatchEditable(groupMatch, false, '2026-06-11T12:00:00Z', actual)).toBe(true);
  });

  it('locks KO edits when official result exists before kickoff (sync/seed edge case)', () => {
    const actual = { matchId: 'r32-1', homeScore: 1, awayScore: 0 };
    expect(isKnockoutFixtureLocked(koMatch, '2026-06-01T00:00:00Z', actual)).toBe(true);
  });

  it('does not reveal others KO picks from official result alone before kickoff', () => {
    expect(canViewOthersPicks(koMatch, '2026-06-27T12:00:00Z')).toBe(false);
  });

  it('reveals others KO picks at kickoff regardless of results', () => {
    expect(canViewOthersPicks(koMatch, '2026-06-28T17:00:00Z')).toBe(true);
  });

  it('voluntary group lock in DB does not alone reveal group picks before first kickoff', () => {
    expect(canViewOthersPicks(groupMatch, '2026-06-01T00:00:00Z', false)).toBe(false);
  });
});
