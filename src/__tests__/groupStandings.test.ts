import { describe, it, expect } from 'vitest';
import {
  compareThirdPlaceStats,
  computeGroupStandings
} from '../lib/groupStandings';
import { rankThirdPlaceTeams } from '../lib/bracketEngine';
import { teams } from '../data/tournament';
import { Pick } from '../types';

function teamId(group: string, index: number): string {
  return teams.filter((team) => team.group === group)[index]!.id;
}

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

  it('ranks by overall goal difference when points are equal', () => {
    const mexico = teamId('A', 0);

    const picks: Record<string, Pick> = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 0 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 },
      'g-a-3': { matchId: 'g-a-3', homeScore: 0, awayScore: 0 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 1, awayScore: 1 },
      'g-a-5': { matchId: 'g-a-5', homeScore: 0, awayScore: 0 },
      'g-a-6': { matchId: 'g-a-6', homeScore: 1, awayScore: 1 }
    };

    const rows = computeGroupStandings('A', picks);
    expect(rows[0]!.teamId).toBe(mexico);
    expect(rows[0]!.pts).toBe(5);
    expect(rows[0]!.gd).toBe(2);
    expect(rows[1]!.pts).toBe(5);
    expect(rows[1]!.gd).toBe(1);
  });

  it('uses head-to-head when teams are tied on points, gd, and gf', () => {
    const mexico = teamId('A', 0);
    const southKorea = teamId('A', 2);

    const picks: Record<string, Pick> = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 1, awayScore: 0 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 },
      'g-a-3': { matchId: 'g-a-3', homeScore: 2, awayScore: 0 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 0, awayScore: 3 },
      'g-a-5': { matchId: 'g-a-5', homeScore: 2, awayScore: 0 },
      'g-a-6': { matchId: 'g-a-6', homeScore: 0, awayScore: 2 }
    };

    const rows = computeGroupStandings('A', picks);
    const mexicoRow = rows.find((row) => row.teamId === mexico)!;
    const southKoreaRow = rows.find((row) => row.teamId === southKorea)!;

    expect(mexicoRow.pts).toBe(6);
    expect(southKoreaRow.pts).toBe(6);
    expect(mexicoRow.gd).toBe(southKoreaRow.gd);
    expect(mexicoRow.gf).toBe(southKoreaRow.gf);
    expect(rows[0]!.teamId).toBe(mexico);
    expect(rows[1]!.teamId).toBe(southKorea);
  });

  it('reorders tied teams when the direct head-to-head result changes', () => {
    const mexico = teamId('A', 0);
    const southKorea = teamId('A', 2);

    const base: Record<string, Pick> = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 1, awayScore: 0 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 0, awayScore: 3 },
      'g-a-5': { matchId: 'g-a-5', homeScore: 2, awayScore: 0 },
      'g-a-6': { matchId: 'g-a-6', homeScore: 0, awayScore: 2 }
    };

    const mexicoFirst = computeGroupStandings('A', {
      ...base,
      'g-a-3': { matchId: 'g-a-3', homeScore: 2, awayScore: 0 }
    });
    const southKoreaFirst = computeGroupStandings('A', {
      ...base,
      'g-a-3': { matchId: 'g-a-3', homeScore: 0, awayScore: 2 }
    });

    expect(mexicoFirst[0]!.teamId).toBe(mexico);
    expect(mexicoFirst[1]!.teamId).toBe(southKorea);
    expect(southKoreaFirst[0]!.teamId).toBe(southKorea);
    expect(southKoreaFirst.findIndex((row) => row.teamId === southKorea)).toBeLessThan(
      southKoreaFirst.findIndex((row) => row.teamId === mexico)
    );
  });

  it('uses stable team id when every FIFA stat is tied', () => {
    const picks: Record<string, Pick> = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 0, awayScore: 0 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 0, awayScore: 0 },
      'g-a-3': { matchId: 'g-a-3', homeScore: 0, awayScore: 0 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 0, awayScore: 0 },
      'g-a-5': { matchId: 'g-a-5', homeScore: 0, awayScore: 0 },
      'g-a-6': { matchId: 'g-a-6', homeScore: 0, awayScore: 0 }
    };

    const rows = computeGroupStandings('A', picks);
    expect(rows.every((row) => row.pts === 3 && row.gd === 0 && row.gf === 0)).toBe(true);
    expect(rows.map((row) => row.teamId)).toEqual([
      'czechia',
      'mexico',
      'south-africa',
      'south-korea'
    ]);
  });
});

describe('compareThirdPlaceStats', () => {
  it('breaks third-place ties with team id after pts, gd, and gf', () => {
    const better = { teamId: 'zzz', pts: 4, gd: 1, gf: 3 };
    const worse = { teamId: 'aaa', pts: 4, gd: 1, gf: 3 };
    expect(compareThirdPlaceStats(better, worse)).toBeGreaterThan(0);
    expect(compareThirdPlaceStats(worse, better)).toBeLessThan(0);
  });

  it('feeds rankThirdPlaceTeams with deterministic ordering', () => {
    const picks: Record<string, Pick> = {};
    for (const group of 'ABCDEFGHIJKL') {
      const ids = teams.filter((team) => team.group === group).map((team) => team.id);
      const [a, b, c, d] = ids;
      const prefix = `g-${group.toLowerCase()}`;
      picks[`${prefix}-1`] = { matchId: `${prefix}-1`, homeScore: 3, awayScore: 0 };
      picks[`${prefix}-2`] = { matchId: `${prefix}-2`, homeScore: 3, awayScore: 0 };
      picks[`${prefix}-3`] = { matchId: `${prefix}-3`, homeScore: 3, awayScore: 0 };
      picks[`${prefix}-4`] = { matchId: `${prefix}-4`, homeScore: 0, awayScore: 0 };
      picks[`${prefix}-5`] = { matchId: `${prefix}-5`, homeScore: 0, awayScore: 0 };
      picks[`${prefix}-6`] = { matchId: `${prefix}-6`, homeScore: 0, awayScore: 1 };
      void b;
      void c;
      void d;
    }

    const ranked = rankThirdPlaceTeams(picks);
    expect(ranked).toHaveLength(12);
    for (let i = 1; i < ranked.length; i += 1) {
      expect(compareThirdPlaceStats(ranked[i - 1]!, ranked[i]!)).toBeLessThanOrEqual(0);
    }
  });
});
