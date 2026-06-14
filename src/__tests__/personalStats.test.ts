import { describe, expect, it } from 'vitest';
import { groupMatches } from '../data/tournament';
import { computeMatchConsensus, UserPicks } from '../lib/predictionStats';
import { buildPersonalStatPool } from '../lib/personalStats';

function buildUser(userId: string, displayName: string, matchIds: string[]): UserPicks {
  return {
    userId,
    displayName,
    picks: Object.fromEntries(
      matchIds.map((matchId) => [matchId, { matchId, homeScore: 2, awayScore: 1 }])
    )
  };
}

describe('buildHiveMindCard via buildPersonalStatPool', () => {
  const fourMatchIds = ['g-a-1', 'g-a-2', 'g-a-3', 'g-a-4'];
  const viewableIds = new Set(fourMatchIds);

  it('omits hive mind when fewer than four upcoming picks exist', () => {
    const users = [
      buildUser('u1', 'Alice', ['g-a-1', 'g-a-2', 'g-a-3']),
      buildUser('u2', 'Bob', fourMatchIds)
    ];
    const matchConsensus = computeMatchConsensus(groupMatches, users, viewableIds);

    const pool = buildPersonalStatPool({
      currentUserId: 'u1',
      matches: groupMatches,
      userPicks: users,
      results: {},
      matchConsensus,
      viewableUpcomingMatchIds: viewableIds,
      groupPhaseLocked: true,
      revealNames: true
    });

    expect(pool.some((card) => card.kind === 'hiveMind')).toBe(false);
  });

  it('includes hive mind when at least four upcoming picks exist', () => {
    const users = [buildUser('u1', 'Alice', fourMatchIds), buildUser('u2', 'Bob', fourMatchIds)];
    const matchConsensus = computeMatchConsensus(groupMatches, users, viewableIds);

    const pool = buildPersonalStatPool({
      currentUserId: 'u1',
      matches: groupMatches,
      userPicks: users,
      results: {},
      matchConsensus,
      viewableUpcomingMatchIds: viewableIds,
      groupPhaseLocked: true,
      revealNames: true
    });

    const hiveMind = pool.find((card) => card.kind === 'hiveMind');
    expect(hiveMind).toBeDefined();
    if (hiveMind && hiveMind.kind === 'hiveMind') {
      expect(hiveMind.matchTotal).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('buildYouVsCrowdCard via buildPersonalStatPool', () => {
  it('includes scoreline breakdown for all crowd predictions', () => {
    const users: UserPicks[] = [
      {
        userId: 'u1',
        displayName: 'Alice',
        picks: {
          'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
          'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 1 }
        }
      },
      {
        userId: 'u2',
        displayName: 'Bob',
        picks: {
          'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
          'g-a-2': { matchId: 'g-a-2', homeScore: 0, awayScore: 0 }
        }
      },
      {
        userId: 'u3',
        displayName: 'Carol',
        picks: {
          'g-a-1': { matchId: 'g-a-1', homeScore: 1, awayScore: 0 },
          'g-a-2': { matchId: 'g-a-2', homeScore: 3, awayScore: 3 }
        }
      }
    ];
    const viewableIds = new Set(['g-a-1', 'g-a-2']);
    const matchConsensus = computeMatchConsensus(groupMatches, users, viewableIds);

    const pool = buildPersonalStatPool({
      currentUserId: 'u1',
      matches: groupMatches,
      userPicks: users,
      results: {},
      matchConsensus,
      viewableUpcomingMatchIds: viewableIds,
      groupPhaseLocked: true,
      revealNames: true
    });

    const youVsCrowd = pool.find((card) => card.kind === 'youVsCrowd');
    expect(youVsCrowd).toBeDefined();
    if (youVsCrowd && youVsCrowd.kind === 'youVsCrowd') {
      expect(youVsCrowd.scorelineBreakdown?.length).toBeGreaterThan(1);
      expect(
        youVsCrowd.scorelineBreakdown?.some((entry) => entry.label === youVsCrowd.yourPick)
      ).toBe(true);
    }
  });
});
