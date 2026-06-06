// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { normalizeScoresToInternalFixture } from '../../lib/fixtureOrientation';
import { groupMatches, teams } from '../../data/tournament';

describe('sync score orientation', () => {
  it('aligns reversed provider scores for previously swapped group fixtures', () => {
    const match = groupMatches.find((m) => m.id === 'g-a-4')!;
    const homeTeam = teams.find((t) => t.id === match.homeTeamId)!;
    const awayTeam = teams.find((t) => t.id === match.awayTeamId)!;

    const normalized = normalizeScoresToInternalFixture(
      match.homeTeamId,
      match.awayTeamId,
      awayTeam.name,
      homeTeam.name,
      1,
      0
    );

    expect(normalized.homeScore).toBe(0);
    expect(normalized.awayScore).toBe(1);
  });
});
