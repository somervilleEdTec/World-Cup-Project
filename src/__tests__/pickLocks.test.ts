import { describe, expect, it } from 'vitest';
import { assertMatchEditable, isMatchEditable } from '../lib/pickLocks';
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
});
