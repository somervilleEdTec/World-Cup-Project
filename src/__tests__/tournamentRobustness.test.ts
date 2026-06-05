import { describe, expect, it } from 'vitest';
import { groupMatches } from '../data/tournament';
import { buildKnockoutMatches, rankThirdPlaceTeams } from '../lib/bracketEngine';
import { computeGroupStandings } from '../lib/groupStandings';
import { computeScore, validatePick, validateBonusPick } from '../lib/tournamentLogic';
import { teams } from '../data/tournament';
import { Match, Pick, TournamentBonusPick } from '../types';

const groupMatch = (id: string, group: string, home: string, away: string): Match => ({
  id,
  stage: 'GROUP',
  group,
  kickoff: '2026-06-11T19:00:00Z',
  homeTeamId: home,
  awayTeamId: away
});

describe('tournament robustness — validation', () => {
  it('rejects knockout draw without progressing team', () => {
    const match: Match = {
      id: 'r32-1',
      stage: 'R32',
      kickoff: '2026-06-28T19:00:00Z',
      homeTeamId: 'mexico',
      awayTeamId: 'canada'
    };
    expect(validatePick(match, { matchId: 'r32-1', homeScore: 1, awayScore: 1 })[0]).toMatch(
      /Draw selected/
    );
  });

  it('rejects progressing team not in the fixture', () => {
    const match: Match = {
      id: 'r32-1',
      stage: 'R32',
      kickoff: '2026-06-28T19:00:00Z',
      homeTeamId: 'mexico',
      awayTeamId: 'canada'
    };
    const errors = validatePick(match, {
      matchId: 'r32-1',
      homeScore: 1,
      awayScore: 1,
      progressingTeamId: 'brazil'
    });
    expect(errors[0]).toMatch(/fixture/i);
  });

  it('accepts boundary scores 0 and 20', () => {
    const match = groupMatch('g-a-1', 'A', 'mexico', 'south-africa');
    expect(validatePick(match, { matchId: 'g-a-1', homeScore: 0, awayScore: 20 })).toHaveLength(
      0
    );
    expect(validatePick(match, { matchId: 'g-a-1', homeScore: 20, awayScore: 0 })).toHaveLength(
      0
    );
  });

  it('rejects every invalid bonus team slot independently', () => {
    const valid: TournamentBonusPick = {
      winnerTeamId: teams[0].id,
      runnerUpTeamId: teams[1].id,
      thirdTeamId: teams[2].id,
      fourthTeamId: teams[3].id
    };
    expect(validateBonusPick(valid)).toHaveLength(0);

    for (const key of Object.keys(valid) as (keyof TournamentBonusPick)[]) {
      const bad = { ...valid, [key]: 'not-a-real-team-id' };
      expect(validateBonusPick(bad)[0]).toMatch(/unknown team/i);
    }
  });
});

describe('tournament robustness — scoring invariants', () => {
  it('never awards group-position points until all six group results exist', () => {
    const picks: Record<string, Pick> = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 }
    };
    const partialActuals = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 }
    };
    expect(computeScore(picks, partialActuals, undefined, undefined).groupPositionPoints).toBe(0);
  });

  it('keeps point breakdown components summing to total', () => {
    const picks: Record<string, Pick> = {};
    const actuals: Record<string, { matchId: string; homeScore: number; awayScore: number }> = {};
    groupMatches.forEach((m, idx) => {
      picks[m.id] = { matchId: m.id, homeScore: idx % 3, awayScore: idx % 2 };
      actuals[m.id] = { matchId: m.id, homeScore: idx % 3, awayScore: idx % 2 };
    });
    const bonus: TournamentBonusPick = {
      winnerTeamId: teams[0].id,
      runnerUpTeamId: teams[1].id,
      thirdTeamId: teams[2].id,
      fourthTeamId: teams[3].id
    };
    const summary = computeScore(picks, actuals, bonus, bonus);
    expect(
      summary.correctResultPoints +
        summary.exactScorePoints +
        summary.groupPositionPoints +
        summary.bonusPoints
    ).toBe(summary.points);
  });

  it('scores knockout using advancing team not group W/D/L on different FT lines', () => {
    const picks = {
      'r32-1': { matchId: 'r32-1', homeScore: 1, awayScore: 0 }
    };
    const actuals = {
      'r32-1': { matchId: 'r32-1', homeScore: 2, awayScore: 0 }
    };
    const summary = computeScore(picks, actuals, undefined, undefined);
    expect(summary.correctResultPoints).toBe(2);
    expect(summary.exactScorePoints).toBe(0);
    expect(summary.points).toBe(2);
  });
});

describe('tournament robustness — bracket stress', () => {
  function allGroupPicks(): Record<string, Pick> {
    const groups = 'ABCDEFGHIJKL'.split('');
    const picks: Record<string, Pick> = {};
    for (const group of groups) {
      const ids = groupMatches.filter((m) => m.group === group).map((m) => m.id);
      const scorelines: Array<[number, number]> = [
        [3, 0],
        [2, 0],
        [1, 0],
        [1, 0],
        [2, 1],
        [0, 1]
      ];
      ids.forEach((id, idx) => {
        const [homeScore, awayScore] = scorelines[idx] ?? [1, 0];
        picks[id] = { matchId: id, homeScore, awayScore };
      });
    }
    return picks;
  }

  it('builds all R32 fixtures without tbd teams from complete varied group picks', () => {
    const ko = buildKnockoutMatches(allGroupPicks());
    const r32 = ko.filter((m) => m.stage === 'R32');
    expect(r32).toHaveLength(16);
    r32.forEach((fixture) => {
      expect(fixture.homeTeamId).not.toBe('tbd');
      expect(fixture.awayTeamId).not.toBe('tbd');
    });
  });

  it('resolves later rounds once feeder knockout results exist', () => {
    const picks = allGroupPicks();
    const actuals: Record<string, { matchId: string; homeScore: number; awayScore: number }> = {};
    const ko = buildKnockoutMatches(picks);
    ko.filter((m) => m.stage === 'R32').forEach((match) => {
      actuals[match.id] = { matchId: match.id, homeScore: 1, awayScore: 0 };
    });
    const afterR32 = buildKnockoutMatches(picks, actuals);
    const r16 = afterR32.filter((m) => m.stage === 'R16');
    expect(r16.length).toBeGreaterThan(0);
    r16.forEach((fixture) => {
      expect(fixture.homeTeamId).not.toBe('tbd');
      expect(fixture.awayTeamId).not.toBe('tbd');
    });
  });

  it('ranks twelve third-place teams deterministically under repeated calls', () => {
    const picks: Record<string, Pick> = {};
    groupMatches.forEach((m) => {
      picks[m.id] = { matchId: m.id, homeScore: 1, awayScore: 0 };
    });
    const first = rankThirdPlaceTeams(picks).map((q) => q.teamId);
    const second = rankThirdPlaceTeams(picks).map((q) => q.teamId);
    expect(second).toEqual(first);
  });

  it('handles extreme but valid scorelines in standings without NaN', () => {
    const picks: Record<string, Pick> = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 20, awayScore: 20 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 0, awayScore: 20 },
      'g-a-3': { matchId: 'g-a-3', homeScore: 20, awayScore: 0 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 10, awayScore: 10 },
      'g-a-5': { matchId: 'g-a-5', homeScore: 5, awayScore: 15 },
      'g-a-6': { matchId: 'g-a-6', homeScore: 15, awayScore: 5 }
    };
    const rows = computeGroupStandings('A', picks);
    rows.forEach((row) => {
      expect(Number.isFinite(row.pts)).toBe(true);
      expect(Number.isFinite(row.gd)).toBe(true);
    });
  });
});
