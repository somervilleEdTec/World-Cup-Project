import { describe, expect, it } from 'vitest';
import { groupMatches } from '../data/tournament';
import {
  computeLadderSwingCandidates,
  computePinnedLadderSwings,
  computePointsOnTheLine,
  computeRankClusterBattles
} from '../lib/leagueImpact';
import { computeMatchConsensus, UserPicks } from '../lib/predictionStats';

describe('leagueImpact', () => {
  const groupAFirst = groupMatches.find((m) => m.id === 'g-a-1')!;
  const groupASecond = groupMatches.find((m) => m.id === 'g-a-2')!;
  const groupAFifth = groupMatches.find((m) => m.id === 'g-a-5')!;
  const groupASixth = groupMatches.find((m) => m.id === 'g-a-6')!;

  const users: UserPicks[] = [
    {
      userId: 'u1',
      displayName: 'Alice',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 0, awayScore: 0 },
        'g-a-5': { matchId: 'g-a-5', homeScore: 2, awayScore: 1 },
        'g-a-6': { matchId: 'g-a-6', homeScore: 1, awayScore: 0 }
      }
    },
    {
      userId: 'u2',
      displayName: 'Bob',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 1, awayScore: 0 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 2 },
        'g-a-5': { matchId: 'g-a-5', homeScore: 0, awayScore: 0 },
        'g-a-6': { matchId: 'g-a-6', homeScore: 2, awayScore: 2 }
      }
    },
    {
      userId: 'u3',
      displayName: 'Carol',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 3, awayScore: 3 },
        'g-a-5': { matchId: 'g-a-5', homeScore: 2, awayScore: 1 },
        'g-a-6': { matchId: 'g-a-6', homeScore: 0, awayScore: 1 }
      }
    }
  ];

  const viewableIds = new Set(['g-a-1', 'g-a-2', 'g-a-5', 'g-a-6']);
  const matchConsensus = computeMatchConsensus(
    [groupAFirst, groupASecond, groupAFifth, groupASixth],
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

  it('pins one ladder card per earliest-kickoff fixture', () => {
    const pinned = computePinnedLadderSwings(
      [groupAFirst, groupASecond],
      users,
      {},
      matchConsensus,
      new Set(['g-a-1', 'g-a-2'])
    );

    expect(pinned.length).toBe(1);
    expect(pinned[0].matchId).toBe('g-a-1');
  });

  it('returns one best pinned ladder when two fixtures share the next kickoff', () => {
    const simultaneousConsensus = computeMatchConsensus(
      [groupAFifth, groupASixth],
      users,
      new Set(['g-a-5', 'g-a-6'])
    );

    const pinned = computePinnedLadderSwings(
      [groupAFifth, groupASixth],
      users,
      {},
      simultaneousConsensus,
      new Set(['g-a-5', 'g-a-6'])
    );

    expect(pinned.length).toBe(1);
    expect(['g-a-5', 'g-a-6']).toContain(pinned[0].matchId);
  });

  it('computes points on the line for modal scoreline', () => {
    const consensus = matchConsensus.find((item) => item.matchId === 'g-a-1');
    const modal = consensus?.topScorelines[0]?.label ?? '2-1';
    const points = computePointsOnTheLine(groupAFirst, users, modal);
    expect(points).toBeGreaterThan(0);
  });

  it('finds rank cluster battles with pick labels', () => {
    const battles = computeRankClusterBattles(
      [groupAFirst, groupASecond],
      users,
      {},
      new Set(['g-a-1', 'g-a-2'])
    );
    expect(battles.length).toBeGreaterThan(0);
    expect(battles[0].pickALabel).toBeTruthy();
    expect(battles[0].pickBLabel).toBeTruthy();
    expect(battles[0].pickALabel).not.toBe(battles[0].pickBLabel);
  });
});
