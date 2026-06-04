import { describe, expect, it } from 'vitest';
import {
  computeScore,
  lockableKnockoutMatchIds,
  shouldLockGroup,
  validateBonusPick,
  validatePick
} from '../lib/tournamentLogic';
import { picksFromActuals } from '../lib/pickUtils';
import { Match, Pick, TournamentBonusPick } from '../types';

describe('tournament logic', () => {
  it('rejects scores above the maximum', () => {
    const match: Match = {
      id: 'g-a-1',
      stage: 'GROUP',
      group: 'A',
      kickoff: '2026-06-11T19:00:00Z',
      homeTeamId: 'mexico',
      awayTeamId: 'south-africa'
    };
    const pick: Pick = { matchId: 'g-a-1', homeScore: 21, awayScore: 0 };
    expect(validatePick(match, pick)[0]).toMatch(/20/);
  });

  it('rejects invalid progressing team on knockout draws', () => {
    const match: Match = {
      id: 'r32-1',
      stage: 'R32',
      kickoff: '2026-06-28T19:00:00Z',
      homeTeamId: 'mexico',
      awayTeamId: 'canada'
    };
    const pick: Pick = {
      matchId: 'r32-1',
      homeScore: 1,
      awayScore: 1,
      progressingTeamId: 'brazil'
    };
    expect(validatePick(match, pick)[0]).toMatch(/fixture/i);
  });

  it('rejects unknown teams in bonus picks', () => {
    const errors = validateBonusPick({
      winnerTeamId: 'not-a-team',
      runnerUpTeamId: 'mexico',
      thirdTeamId: 'canada',
      fourthTeamId: 'switzerland'
    });
    expect(errors[0]).toMatch(/unknown team/i);
  });

  it('requires team_to_progress for knockout draws', () => {
    const match: Match = {
      id: 'x',
      stage: 'R16',
      kickoff: '2026-07-01T18:00:00Z',
      homeTeamId: 'mexico',
      awayTeamId: 'canada'
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
  });

  it('awards match, group-position, and bonus points', () => {
    const picks = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 },
      'g-a-3': { matchId: 'g-a-3', homeScore: 1, awayScore: 1 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 0, awayScore: 2 },
      'g-a-5': { matchId: 'g-a-5', homeScore: 1, awayScore: 0 },
      'g-a-6': { matchId: 'g-a-6', homeScore: 1, awayScore: 2 }
    };

    const actuals = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 },
      'g-a-3': { matchId: 'g-a-3', homeScore: 0, awayScore: 0 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 0, awayScore: 2 },
      'g-a-5': { matchId: 'g-a-5', homeScore: 1, awayScore: 0 },
      'g-a-6': { matchId: 'g-a-6', homeScore: 1, awayScore: 2 }
    };

    const bonus: TournamentBonusPick = {
      winnerTeamId: 'mexico',
      runnerUpTeamId: 'canada',
      thirdTeamId: 'switzerland',
      fourthTeamId: 'south-korea'
    };

    const summary = computeScore(picks, actuals, bonus, bonus);
    expect(summary.points).toBeGreaterThanOrEqual(40);
    expect(summary.bonusHits).toBe(4);
    expect(summary.bonusPoints).toBe(18);
    expect(summary.exactScores).toBeGreaterThanOrEqual(5);
    expect(
      summary.correctResultPoints +
        summary.exactScorePoints +
        summary.groupPositionPoints +
        summary.bonusPoints
    ).toBe(summary.points);
  });

  it('does not award group-position points until all six group results exist', () => {
    const picks = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 }
    };
    const partialActuals = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 }
    };
    const summary = computeScore(picks, partialActuals, undefined, undefined);
    expect(summary.exactGroupPositions).toBe(0);
  });

  it('scores exact group positions from official results', () => {
    const picks = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 },
      'g-a-3': { matchId: 'g-a-3', homeScore: 1, awayScore: 1 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 0, awayScore: 2 },
      'g-a-5': { matchId: 'g-a-5', homeScore: 1, awayScore: 0 },
      'g-a-6': { matchId: 'g-a-6', homeScore: 1, awayScore: 2 }
    };
    const actuals = {
      'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
      'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 0 },
      'g-a-3': { matchId: 'g-a-3', homeScore: 1, awayScore: 1 },
      'g-a-4': { matchId: 'g-a-4', homeScore: 0, awayScore: 2 },
      'g-a-5': { matchId: 'g-a-5', homeScore: 1, awayScore: 0 },
      'g-a-6': { matchId: 'g-a-6', homeScore: 0, awayScore: 1 }
    };
    const summary = computeScore(picks, actuals, undefined, undefined);
    expect(summary.exactGroupPositions).toBeGreaterThan(0);
    expect(picksFromActuals(actuals)['g-a-1']?.homeScore).toBe(2);
  });
});
