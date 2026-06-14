import { describe, expect, it } from 'vitest';
import { groupMatches } from '../data/tournament';
import {
  buildCrowdStatPool,
  buildPinnedLadderCard,
  CROWD_STATS_COUNT,
  collectViewablePicks,
  countUpcomingFixtures,
  sampleCrowdStats,
  VISUAL_TYPE_ORDER
} from '../lib/crowdStatPool';
import { computeMatchConsensus, UserPicks } from '../lib/predictionStats';
import { buildPersonalStatPool, partitionPersonalStats } from '../lib/personalStats';
import { isUpcomingFixture } from '../lib/comparisonVisibility';

describe('crowdStatPool', () => {
  const groupAFirst = groupMatches.find((m) => m.id === 'g-a-1')!;
  const groupASecond = groupMatches.find((m) => m.id === 'g-a-2')!;

  const users: UserPicks[] = [
    {
      userId: 'u1',
      displayName: 'Alice',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 1 }
      },
      bonus: {
        winnerTeamId: 'brazil',
        runnerUpTeamId: 'france',
        thirdTeamId: 'germany',
        fourthTeamId: 'spain'
      }
    },
    {
      userId: 'u2',
      displayName: 'Bob',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 0, awayScore: 0 }
      },
      bonus: {
        winnerTeamId: 'brazil',
        runnerUpTeamId: 'argentina',
        thirdTeamId: 'germany',
        fourthTeamId: 'spain'
      }
    },
    {
      userId: 'u3',
      displayName: 'Carol',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 1, awayScore: 0 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 3, awayScore: 3 }
      },
      bonus: {
        winnerTeamId: 'argentina',
        runnerUpTeamId: 'france',
        thirdTeamId: 'germany',
        fourthTeamId: 'spain'
      }
    }
  ];

  const viewableIds = new Set(['g-a-1', 'g-a-2']);
  const matchConsensus = computeMatchConsensus(groupMatches, users, viewableIds);
  const allViewablePicks = collectViewablePicks(groupMatches, users, viewableIds);

  const poolInput = {
    matches: groupMatches,
    userPicks: users,
    viewableUpcomingMatchIds: viewableIds,
    allViewablePicks,
    matchConsensus,
    groupPhaseLocked: true,
    results: {} as Record<string, never>,
    currentUserId: 'u1'
  };

  it('builds a pool with mixed visual types when locked', () => {
    const pool = buildCrowdStatPool(poolInput, { revealNames: true });

    const visualTypes = new Set(pool.map((c) => c.visualType));
    expect(pool.length).toBeGreaterThan(0);
    expect(visualTypes.has('fixture') || visualTypes.has('hero')).toBe(true);
    expect(pool.some((c) => c.visualType === 'ladder')).toBe(true);
  });

  it('may include group standings cards when players have full group orders', () => {
    const fullGroupUsers: UserPicks[] = users.map((user) => ({
      ...user,
      picks: {
        ...user.picks,
        'g-a-3': { matchId: 'g-a-3', homeScore: 1, awayScore: 0 },
        'g-a-4': { matchId: 'g-a-4', homeScore: 2, awayScore: 2 },
        'g-a-5': { matchId: 'g-a-5', homeScore: 1, awayScore: 1 },
        'g-a-6': { matchId: 'g-a-6', homeScore: 0, awayScore: 1 }
      }
    }));
    const fullConsensus = computeMatchConsensus(groupMatches, fullGroupUsers, viewableIds);
    const pool = buildCrowdStatPool(
      { ...poolInput, userPicks: fullGroupUsers, matchConsensus: fullConsensus },
      { revealNames: true }
    );
    const groupCard = pool.find((c) => c.visualType === 'standings' && c.variant === 'consensus');
    expect(groupCard).toBeDefined();
    if (groupCard && groupCard.visualType === 'standings') {
      expect(groupCard.modalOrder?.length).toBe(4);
    }
  });

  it('anonymizes team names in pre-lock pool', () => {
    const pool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: new Set(),
        allViewablePicks: [],
        matchConsensus: [],
        groupPhaseLocked: false,
        results: {}
      },
      { revealNames: false }
    );

    const allText = pool
      .filter((c) => c.visualType === 'insight' && (c.kind === 'fact' || c.kind === 'spotlight'))
      .map((c) => c.text)
      .join(' ');

    expect(allText.includes('Brazil')).toBe(false);
    expect(allText.includes('Mexico')).toBe(false);
    expect(pool.some((c) => c.visualType === 'insight')).toBe(true);
  });

  it('samples exactly six cards with head to head and ladder pinned first', () => {
    const pool = buildCrowdStatPool(poolInput, { revealNames: true });

    const pinnedLadder = buildPinnedLadderCard(
      groupMatches,
      users,
      {},
      matchConsensus,
      viewableIds
    );
    const personalPool = buildPersonalStatPool({
      currentUserId: 'u1',
      matches: groupMatches,
      userPicks: users,
      results: {},
      matchConsensus,
      viewableUpcomingMatchIds: viewableIds,
      groupPhaseLocked: true,
      revealNames: true
    });
    const { pinnedHeadToHead, remainingPersonal } = partitionPersonalStats(personalPool);

    const sampled = sampleCrowdStats(pool, {
      pinnedHeadToHead,
      pinnedLadder,
      remainingPersonal,
      shuffle: false
    });
    expect(sampled.length).toBe(CROWD_STATS_COUNT);
    if (pinnedHeadToHead) {
      expect(sampled[0].visualType).toBe('personal');
    }
    if (pinnedLadder) {
      expect(sampled[pinnedHeadToHead ? 1 : 0].visualType).toBe('ladder');
    }
    const visualTypes = new Set(sampled.map((c) => c.visualType));
    expect(visualTypes.size).toBeGreaterThanOrEqual(3);
    expect(VISUAL_TYPE_ORDER[0]).toBe('personal');
  });

  it('returns deterministic sample with pinned cards prepended when shuffle is false', () => {
    const pool = buildCrowdStatPool(poolInput, { revealNames: true });
    const pinnedLadder = buildPinnedLadderCard(
      groupMatches,
      users,
      {},
      matchConsensus,
      viewableIds
    );
    const { pinnedHeadToHead, remainingPersonal } = partitionPersonalStats(
      buildPersonalStatPool({
        currentUserId: 'u1',
        matches: groupMatches,
        userPicks: users,
        results: {},
        matchConsensus,
        viewableUpcomingMatchIds: viewableIds,
        groupPhaseLocked: true,
        revealNames: true
      })
    );

    const sampled = sampleCrowdStats(pool, {
      shuffle: false,
      pinnedHeadToHead,
      pinnedLadder,
      remainingPersonal
    });
    const pinnedCount = (pinnedHeadToHead ? 1 : 0) + (pinnedLadder ? 1 : 0);
    const shufflePool = [
      ...remainingPersonal,
      ...pool.filter((card) => card.visualType !== 'ladder' && card.visualType !== 'personal')
    ];
    expect(sampled.slice(0, pinnedCount).filter(Boolean)).toHaveLength(pinnedCount);
    expect(sampled.slice(pinnedCount)).toEqual(shufflePool.slice(0, CROWD_STATS_COUNT - pinnedCount));
  });

  it('excludes past fixtures from upcoming count', () => {
    const past = groupMatches.filter((m) => m.id === 'g-a-1');
    const count = countUpcomingFixtures(past, '2026-06-13T00:00:00Z', {});
    expect(count).toBe(0);
    expect(isUpcomingFixture(groupAFirst, '2026-06-11T18:00:00Z', {})).toBe(true);
    expect(isUpcomingFixture(groupASecond, '2026-06-13T00:00:00Z', {})).toBe(false);
  });

  it('includes hero and fixture cards only when group phase is locked', () => {
    const lockedPool = buildCrowdStatPool(poolInput, { revealNames: true });
    const unlockedPool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: new Set(),
        allViewablePicks: [],
        matchConsensus: [],
        groupPhaseLocked: false,
        results: {}
      },
      { revealNames: false }
    );

    expect(lockedPool.some((c) => c.visualType === 'hero')).toBe(true);
    expect(lockedPool.some((c) => c.visualType === 'fixture')).toBe(true);
    expect(unlockedPool.some((c) => c.visualType === 'hero')).toBe(false);
    expect(unlockedPool.some((c) => c.visualType === 'fixture')).toBe(false);
  });

  it('does not include lock-percentage stats after group lock', () => {
    const pool = buildCrowdStatPool(poolInput, { revealNames: true });

    const text = pool.map((c) => ('text' in c ? c.text : '')).join(' ');
    expect(text.includes('locked in their tournament podium')).toBe(false);
    expect(text.includes('back the home team')).toBe(false);
    expect(text.includes('back an away win')).toBe(false);
  });

  it('includes volatile and cluster cards when enough data exists', () => {
    const pool = buildCrowdStatPool(poolInput, { revealNames: true });
    expect(pool.some((c) => c.visualType === 'volatile' || c.visualType === 'cluster')).toBe(true);
  });

  it('returns empty sample for empty pool without pinned cards', () => {
    expect(sampleCrowdStats([])).toEqual([]);
  });

  it('caps sample at pool length when pool is smaller than six', () => {
    const tinyPool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: [{ userId: 'u1', displayName: 'Solo', picks: {} }],
        viewableUpcomingMatchIds: new Set(),
        allViewablePicks: [],
        matchConsensus: [],
        groupPhaseLocked: false,
        results: {}
      },
      { revealNames: false }
    );
    const sampled = sampleCrowdStats(tinyPool, { shuffle: false });
    expect(sampled.length).toBeLessThanOrEqual(tinyPool.length);
  });
});
