import { describe, expect, it } from 'vitest';
import { computeScore, lockableKnockoutMatchIds, shouldLockGroup, validatePick } from '../lib/tournamentLogic';
import { Match, Pick, TournamentBonusPick } from '../types';

describe('tournament logic', () => {
  it('requires team_to_progress for knockout draws', () => {
    const match: Match = {
      id: 'x',
      stage: 'R16',
      kickoff: '2026-07-01T18:00:00Z',
      homeTeamId: 'mex',
      awayTeamId: 'can'
    };

    const pick: Pick = { matchId: 'x', homeScore: 1, awayScore: 1 };
    const errors = validatePick(match, pick);
    expect(errors[0]).toContain('Draw selected');
  });

  it('locks group stage after first kickoff', () => {
    expect(shouldLockGroup('2026-06-11T19:01:00Z')).toBe(true);
    expect(shouldLockGroup('2026-06-11T18:59:00Z')).toBe(false);
  });

  it('locks knockout fixtures at own kickoff', () => {
    const lockedIds = lockableKnockoutMatchIds('2026-07-19T20:00:00Z');
    expect(lockedIds.length).toBeGreaterThan(0);
    expect(lockedIds).toContain('final-1');
  });

  it('awards match, group-position, and bonus points', () => {
    const picks = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 },
      'g-a-3': { matchId: 'g-a-3', homeScore: 1, awayScore: 1 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 0, awayScore: 2 }
    };

    const actuals = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 },
      'g-a-3': { matchId: 'g-a-3', homeScore: 0, awayScore: 0 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 0, awayScore: 2 }
    };

    const bonus: TournamentBonusPick = {
      winnerTeamId: 'mex',
      runnerUpTeamId: 'can',
      thirdTeamId: 'sui',
      fourthTeamId: 'kor'
    };

    const summary = computeScore(picks, actuals, bonus, bonus);
    expect(summary.points).toBeGreaterThanOrEqual(35);
    expect(summary.bonusHits).toBe(4);
    expect(summary.exactScores).toBeGreaterThanOrEqual(3);
  });
});
