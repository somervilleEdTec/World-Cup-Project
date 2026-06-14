import { describe, expect, it } from 'vitest';
import { groupMatches } from '../data/tournament';
import {
  computeLadderSwingCandidates,
  computePointsOnTheLine,
  computeRankClusterBattles
} from '../lib/leagueImpact';
import { computeMatchConsensus, UserPicks } from '../lib/predictionStats';

describe('leagueImpact', () => {
  const groupAFirst = groupMatches.find((m) => m.id === 'g-a-1')!;
  const groupASecond = groupMatches.find((m) => m.id === 'g-a-2')!;

  const users: UserPicks[] = [
    {
      userId: 'u1',
      displayName: 'Alice',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 0, awayScore: 0 }
      }
    },
    {
      userId: 'u2',
      displayName: 'Bob',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 1, awayScore: 0 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 2 }
      }
    },
    {
      userId: 'u3',
      displayName: 'Carol',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 3, awayScore: 3 }
      }
    }
  ];

  const viewableIds = new Set(['g-a-1', 'g-a-2']);
  const matchConsensus = computeMatchConsensus(
    [groupAFirst, groupASecond],
    users,
    viewableIds
  );

  it('computes ladder swing candidates when scorelines shift ranks', () => {
    const results = {
      'g-a-1': {
        matchId: 'g-a-1',
        homeScore: 2,
        awayScore: 1
      }
    };

    const candidates = computeLadderSwingCandidates(
      [groupAFirst, groupASecond],
      users,
      results,
      matchConsensus,
      new Set(['g-a-2'])
    );

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].movers.length).toBeGreaterThan(0);
    expect(candidates[0].maxSwing).toBeGreaterThanOrEqual(1);
  });

  it('computes points on the line for modal scoreline', () => {
    const consensus = matchConsensus.find((item) => item.matchId === 'g-a-1');
    const modal = consensus?.topScorelines[0]?.label ?? '2-1';
    const points = computePointsOnTheLine(groupAFirst, users, modal);
    expect(points).toBeGreaterThan(0);
  });

  it('finds rank cluster battles between nearby players', () => {
    const battles = computeRankClusterBattles(
      [groupAFirst, groupASecond],
      users,
      {},
      viewableIds
    );
    expect(battles.length).toBeGreaterThan(0);
    expect(battles[0].playerA).toBeTruthy();
    expect(battles[0].playerB).toBeTruthy();
  });
});
