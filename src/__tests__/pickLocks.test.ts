import { describe, expect, it } from 'vitest';
import {
  allGroupPicksCommitted,
  assertAllGroupPicksCommitted,
  assertMatchEditable,
  countCommittedGroupPicks,
  GROUP_MATCH_COUNT,
  isKnockoutFixtureLocked,
  isMatchEditable
} from '../lib/pickLocks';
import { groupMatches } from '../data/tournament';
import { Match } from '../types';

const groupMatch: Match = {
  id: 'g-a-1',
  stage: 'GROUP',
  group: 'A',
  kickoff: '2026-06-11T19:00:00Z',
  homeTeamId: 'mexico',
  awayTeamId: 'south-africa'
};

const koMatch: Match = {
  id: 'r32-1',
  stage: 'R32',
  kickoff: '2026-06-28T19:00:00Z',
  homeTeamId: 'mexico',
  awayTeamId: 'canada'
};

describe('pick locks', () => {
  it('blocks group picks after first kickoff', () => {
    expect(() => assertMatchEditable(groupMatch, false, '2026-06-11T20:00:00Z')).toThrow(/locked/i);
    expect(isMatchEditable(groupMatch, false, '2026-06-11T18:00:00Z')).toBe(true);
  });

  it('blocks knockout picks after fixture kickoff', () => {
    expect(() => assertMatchEditable(koMatch, false, '2026-06-28T20:00:00Z')).toThrow(/locked/i);
    expect(isMatchEditable(koMatch, false, '2026-06-28T18:00:00Z')).toBe(true);
  });

  it('blocks knockout picks when an official result exists', () => {
    const actual = { matchId: 'r32-1', homeScore: 2, awayScore: 1 };
    expect(() => assertMatchEditable(koMatch, false, '2026-06-01T00:00:00Z', actual)).toThrow(/locked/i);
    expect(isKnockoutFixtureLocked(koMatch, '2026-06-01T00:00:00Z', actual)).toBe(true);
    expect(isKnockoutFixtureLocked(koMatch, '2026-06-01T00:00:00Z')).toBe(false);
  });

  it('requires all group picks committed before first kickoff', () => {
    const partial: Record<string, { matchId: string; homeScore: number; awayScore: number }> = {};
    groupMatches.slice(0, 10).forEach((m) => {
      partial[m.id] = { matchId: m.id, homeScore: 1, awayScore: 0 };
    });
    expect(countCommittedGroupPicks(partial)).toBe(10);
    expect(allGroupPicksCommitted(partial)).toBe(false);
    expect(() => assertAllGroupPicksCommitted(partial, false, '2026-06-01T00:00:00Z')).toThrow(
      String(GROUP_MATCH_COUNT)
    );
  });
});
