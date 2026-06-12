import { describe, expect, it } from 'vitest';
import { groupMatches } from '../data/tournament';
import {
  buildCrowdStatPool,
  CROWD_STATS_MAX,
  CROWD_STATS_MIN,
  collectViewablePicks,
  countUpcomingFixtures,
  sampleCrowdStats
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
    }
  ];

  const viewableIds = new Set(['g-a-1', 'g-a-2']);
  const matchConsensus = computeMatchConsensus(groupMatches, users, viewableIds);
  const allViewablePicks = collectViewablePicks(groupMatches, users, viewableIds);

  it('builds a pool with mixed card kinds when locked', () => {
    const pool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: viewableIds,
        allViewablePicks,
        matchConsensus,
        groupPhaseLocked: true
      },
      { revealNames: true }
    );

    const kinds = new Set(pool.map((c) => c.kind));
    expect(pool.length).toBeGreaterThan(0);
    expect(kinds.has('fact') || kinds.has('hero') || kinds.has('match')).toBe(true);
  });

  it('anonymizes team names in pre-lock pool', () => {
    const pool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: new Set(),
        allViewablePicks: [],
        matchConsensus: [],
        groupPhaseLocked: false
      },
      { revealNames: false }
    );

    const allText = pool
      .filter((c) => c.kind === 'fact' || c.kind === 'spotlight')
      .map((c) => (c.kind === 'fact' || c.kind === 'spotlight' ? c.text : ''))
      .join(' ');

    expect(allText.includes('Brazil')).toBe(false);
    expect(allText.includes('Mexico')).toBe(false);
    expect(pool.some((c) => c.kind === 'fact')).toBe(true);
  });

  it('samples between min and max cards with stratified kinds', () => {
    const pool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: viewableIds,
        allViewablePicks,
        matchConsensus,
        groupPhaseLocked: true
      },
      { revealNames: true }
    );

    const sampled = sampleCrowdStats(pool);
    expect(sampled.length).toBeGreaterThanOrEqual(1);
    expect(sampled.length).toBeLessThanOrEqual(CROWD_STATS_MAX);
    expect(sampled.length).toBeLessThanOrEqual(pool.length);
  });

  it('returns deterministic first N when shuffle is false', () => {
    const pool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: viewableIds,
        allViewablePicks,
        matchConsensus,
        groupPhaseLocked: true
      },
      { revealNames: true }
    );

    const sampled = sampleCrowdStats(pool, { shuffle: false, min: 3, max: 3 });
    expect(sampled).toEqual(pool.slice(0, 3));
  });

  it('excludes past fixtures from upcoming count', () => {
    const past = groupMatches.filter((m) => m.id === 'g-a-1');
    const count = countUpcomingFixtures(past, '2026-06-13T00:00:00Z', {});
    expect(count).toBe(0);
    expect(isUpcomingFixture(groupAFirst, '2026-06-11T18:00:00Z', {})).toBe(true);
    expect(isUpcomingFixture(groupASecond, '2026-06-13T00:00:00Z', {})).toBe(false);
  });

  it('includes hero and match cards only when group phase is locked', () => {
    const lockedPool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: users,
        viewableUpcomingMatchIds: viewableIds,
        allViewablePicks,
        matchConsensus,
        groupPhaseLocked: true
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
        groupPhaseLocked: false
      },
      { revealNames: false }
    );

    expect(lockedPool.some((c) => c.kind === 'hero')).toBe(true);
    expect(lockedPool.some((c) => c.kind === 'match')).toBe(true);
    expect(unlockedPool.some((c) => c.kind === 'hero')).toBe(false);
    expect(unlockedPool.some((c) => c.kind === 'match')).toBe(false);
  });

  it('returns empty sample for empty pool', () => {
    expect(sampleCrowdStats([])).toEqual([]);
  });

  it('caps sample at pool length when pool is smaller than min', () => {
    const tinyPool = buildCrowdStatPool(
      {
        matches: groupMatches,
        userPicks: [{ userId: 'u1', displayName: 'Solo', picks: {} }],
        viewableUpcomingMatchIds: new Set(),
        allViewablePicks: [],
        matchConsensus: [],
        groupPhaseLocked: false
      },
      { revealNames: false }
    );
    const sampled = sampleCrowdStats(tinyPool, { shuffle: false, min: CROWD_STATS_MIN, max: CROWD_STATS_MAX });
    expect(sampled.length).toBeLessThanOrEqual(tinyPool.length);
  });
});
