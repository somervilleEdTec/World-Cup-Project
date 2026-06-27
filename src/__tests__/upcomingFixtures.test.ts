import { describe, expect, it } from 'vitest';
import { sortMatchesByKickoff } from '../lib/upcomingFixtures';
import { Match } from '../types';

function match(id: string, kickoff: string): Match {
  return { id, stage: 'R16', kickoff, homeTeamId: 'a', awayTeamId: 'b' };
}

describe('sortMatchesByKickoff', () => {
  it('orders matches by kickoff then id', () => {
    const sorted = sortMatchesByKickoff([
      match('r16-3', '2026-07-06T19:00:00.000Z'),
      match('r16-5', '2026-07-05T20:00:00.000Z'),
      match('r16-1', '2026-07-04T17:00:00.000Z'),
      match('r16-2', '2026-07-04T17:00:00.000Z')
    ]);

    expect(sorted.map((m) => m.id)).toEqual(['r16-1', 'r16-2', 'r16-5', 'r16-3']);
  });
});
