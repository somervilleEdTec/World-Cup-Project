import { describe, it, expect } from 'vitest';
import { computeGroupStandings } from '../lib/groupStandings';
import { teams } from '../data/tournament';

describe('groupStandings', () => {
  it('shows all zeros when no picks exist for a group', () => {
    const rows = computeGroupStandings('A', {});
    expect(rows).toHaveLength(4);
    rows.forEach((row) => {
      expect(row.gp).toBe(0);
      expect(row.w).toBe(0);
      expect(row.d).toBe(0);
      expect(row.l).toBe(0);
      expect(row.gf).toBe(0);
      expect(row.ga).toBe(0);
      expect(row.pts).toBe(0);
    });
  });

  it('ignores picks with negative scores', () => {
    const groupTeams = teams.filter((t) => t.group === 'A');
    const [home, away] = groupTeams;
    const rows = computeGroupStandings('A', {
      'g-a-1': { matchId: 'g-a-1', homeScore: -1, awayScore: 0 }
    });
    const homeRow = rows.find((r) => r.teamId === home.id)!;
    const awayRow = rows.find((r) => r.teamId === away.id)!;
    expect(homeRow.gp).toBe(0);
    expect(awayRow.gp).toBe(0);
  });
});
