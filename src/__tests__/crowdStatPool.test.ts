import { describe, expect, it } from 'vitest';
import { groupMatches } from '../data/tournament';
import {
  buildCrowdStatPool,
  CROWD_STATS_COUNT,
  collectViewablePicks,
  countUpcomingFixtures,
  sampleCrowdStats,
  VISUAL_TYPE_ORDER
} from '../lib/crowdStatPool';
import { computeMatchConsensus, UserPicks } from '../lib/predictionStats';
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

  it('builds a pool with mixed visual types when locked', () => {
    const pool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: viewableIds,
        allViewablePicks,
        matchConsensus,
        groupPhaseLocked: true,
        results: {}
      },
      { revealNames: true }
    );

    const visualTypes = new Set(pool.map((c) => c.visualType));
    expect(pool.length).toBeGreaterThan(0);
    expect(visualTypes.has('fixture') || visualTypes.has('hero')).toBe(true);
    expect(pool.some((c) => c.visualType === 'ladder')).toBe(true);
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
      .filter((c) => c.visualType === 'insight')
      .map((c) => c.text)
      .join(' ');

    expect(allText.includes('Brazil')).toBe(false);
    expect(allText.includes('Mexico')).toBe(false);
    expect(pool.some((c) => c.visualType === 'insight')).toBe(true);
  });

  it('samples exactly six cards with distinct visual types when available', () => {
    const pool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: viewableIds,
        allViewablePicks,
        matchConsensus,
        groupPhaseLocked: true,
        results: {}
      },
      { revealNames: true }
    );

    const sampled = sampleCrowdStats(pool);
    expect(sampled.length).toBe(CROWD_STATS_COUNT);
    const visualTypes = new Set(sampled.map((c) => c.visualType));
    expect(visualTypes.size).toBeGreaterThanOrEqual(4);
    expect(sampled.map((c) => c.visualType)).toEqual(
      expect.arrayContaining(
        VISUAL_TYPE_ORDER.filter((type) => pool.some((card) => card.visualType === type)).slice(0, 6)
      )
    );
  });

  it('returns deterministic first N when shuffle is false', () => {
    const pool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: viewableIds,
        allViewablePicks,
        matchConsensus,
        groupPhaseLocked: true,
        results: {}
      },
      { revealNames: true }
    );

    const sampled = sampleCrowdStats(pool, { shuffle: false });
    expect(sampled).toEqual(pool.slice(0, CROWD_STATS_COUNT));
  });

  it('excludes past fixtures from upcoming count', () => {
    const past = groupMatches.filter((m) => m.id === 'g-a-1');
    const count = countUpcomingFixtures(past, '2026-06-13T00:00:00Z', {});
    expect(count).toBe(0);
    expect(isUpcomingFixture(groupAFirst, '2026-06-11T18:00:00Z', {})).toBe(true);
    expect(isUpcomingFixture(groupASecond, '2026-06-13T00:00:00Z', {})).toBe(false);
  });

  it('includes hero and fixture cards only when group phase is locked', () => {
    const lockedPool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: viewableIds,
        allViewablePicks,
        matchConsensus,
        groupPhaseLocked: true,
        results: {}
      },
      { revealNames: true }
    );
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
    const pool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: viewableIds,
        allViewablePicks,
        matchConsensus,
        groupPhaseLocked: true,
        results: {}
      },
      { revealNames: true }
    );

    const text = pool.map((c) => ('text' in c ? c.text : '')).join(' ');
    expect(text.includes('locked in their tournament podium')).toBe(false);
    expect(text.includes('back the home team')).toBe(false);
    expect(text.includes('back an away win')).toBe(false);
  });

  it('returns empty sample for empty pool', () => {
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
