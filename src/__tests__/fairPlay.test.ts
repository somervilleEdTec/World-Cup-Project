import { describe, it, expect } from 'vitest';
import {
  computeFairPlayByTeam,
  fairPlayPointsFromDiscipline
} from '../lib/fairPlay';
import { computeGroupStandings } from '../lib/groupStandings';
import { teamIdFromProviderName } from '../server/services/matchMapping';

describe('fairPlay', () => {
  it('scores FIFA card deductions (higher is better)', () => {
    expect(fairPlayPointsFromDiscipline({ yellowCards: 1, secondYellowReds: 0, directReds: 0 })).toBe(
      -1
    );
    expect(
      fairPlayPointsFromDiscipline({ yellowCards: 0, secondYellowReds: 1, directReds: 0 })
    ).toBe(-3);
    expect(
      fairPlayPointsFromDiscipline({ yellowCards: 0, secondYellowReds: 0, directReds: 1 })
    ).toBe(-4);
  });

  it('accumulates discipline from static snapshot for Group H MD1', () => {
    const picks = {
      'g-h-2': { matchId: 'g-h-2', homeScore: 1, awayScore: 1 }
    };
    const fairPlay = computeFairPlayByTeam('H', picks);
    expect(fairPlay['saudi-arabia']).toBe(-1);
    expect(fairPlay.uruguay).toBe(0);
  });

  it('orders Group H MD1 via snapshot discipline without explicit fairPlay map', () => {
    const picks = {
      'g-h-1': { matchId: 'g-h-1', homeScore: 0, awayScore: 0 },
      'g-h-2': { matchId: 'g-h-2', homeScore: 1, awayScore: 1 }
    };
    const fairPlay = computeFairPlayByTeam('H', picks);
    const rows = computeGroupStandings('H', picks, { fairPlayByTeam: fairPlay });
    expect(rows.map((row) => row.teamId)).toEqual([
      'uruguay',
      'saudi-arabia',
      'spain',
      'cape-verde'
    ]);
  });
});

describe('teamIdFromProviderName', () => {
  it('maps Cabo Verde to cape-verde', () => {
    expect(teamIdFromProviderName('Cabo Verde')).toBe('cape-verde');
  });
});
