import { describe, it, expect } from 'vitest';
import { computeMissingPicks } from '../lib/missingPicks';
import { groupMatches, teams } from '../data/tournament';

describe('missingPicks', () => {
  it('lists tournament places, groups, and knockout fixtures that are incomplete', () => {
    const missing = computeMissingPicks({}, undefined, [
      {
        id: 'r32-1',
        stage: 'R32',
        kickoff: '2026-07-01T19:00:00Z',
        homeTeamId: teams[0].id,
        awayTeamId: teams[1].id
      }
    ]);

    expect(missing.some((item) => item.label === 'Tournament Place: Winner')).toBe(true);
    expect(missing.some((item) => item.label === 'Group A')).toBe(true);
    expect(missing.some((item) => item.kind === 'knockout')).toBe(true);
  });

  it('returns nothing when tournament, all groups, and knockout picks are complete', () => {
    const bonus = {
      winnerTeamId: teams[0].id,
      runnerUpTeamId: teams[1].id,
      thirdTeamId: teams[2].id,
      fourthTeamId: teams[3].id
    };
    const picks = Object.fromEntries(
      groupMatches.map((match) => [match.id, { matchId: match.id, homeScore: 1, awayScore: 0 }])
    );
    const missing = computeMissingPicks(picks, bonus, []);
    expect(missing).toHaveLength(0);
  });
});
