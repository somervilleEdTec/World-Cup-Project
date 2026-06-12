// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { setupTestServer, teardownTestServer } from '../testHarness';
import { createPlayer } from './authHelpers';
import { computeStatistics } from '../services/statistics';
import { saveDraftPick } from '../services/predictions';
import { getDb } from '../database';
import type { Express } from 'express';

const PRE_LOCK_NOW = '2026-06-11T18:00:00Z';
const POST_LOCK_NOW = '2026-06-12T01:00:00Z';

let app: Express;

beforeEach(async () => {
  app = await setupTestServer();
});

afterAll(async () => {
  await teardownTestServer();
});

async function seedTwoPlayersWithPicks(nowIso: string) {
  await createPlayer(app, 'Stats A', 'abc');
  await createPlayer(app, 'Stats B', 'abc');

  const db = getDb();
  const users = await db.all<{ id: string }>(
    `SELECT id FROM users WHERE display_name IN ('Stats A', 'Stats B') ORDER BY display_name`
  );

  for (const user of users) {
    for (const matchId of ['g-a-1', 'g-a-2']) {
      await saveDraftPick(
        user.id,
        { matchId, homeScore: 2, awayScore: 1 },
        nowIso
      );
    }
  }
}

describe('computeStatistics', () => {
  it('returns anonymized crowdCards before group lock', async () => {
    await seedTwoPlayersWithPicks(PRE_LOCK_NOW);

    const stats = await computeStatistics(PRE_LOCK_NOW);
    expect(stats.meta.groupPhaseLocked).toBe(false);
    expect(stats.crowdCards.length).toBeGreaterThan(0);
    expect(stats.crowdCards.length).toBeLessThanOrEqual(8);
    expect(stats.meta.cardCount).toBe(stats.crowdCards.length);
    expect(stats.crowdCards.some((c) => c.kind === 'match')).toBe(false);
    expect(stats.crowdCards.some((c) => c.kind === 'hero')).toBe(false);
    const text = JSON.stringify(stats.crowdCards);
    expect(text.includes('Brazil')).toBe(false);
  });

  it('returns mixed crowdCards after group lock with upcoming fixtures', async () => {
    await seedTwoPlayersWithPicks(PRE_LOCK_NOW);

    const { runAutoLocks } = await import('../services/predictions');
    await runAutoLocks('2026-06-12T00:00:00Z');

    const stats = await computeStatistics(POST_LOCK_NOW);
    expect(stats.meta.groupPhaseLocked).toBe(true);
    expect(stats.crowdCards.length).toBeGreaterThan(0);
    expect(stats.crowdCards.length).toBeLessThanOrEqual(8);
    const kinds = stats.crowdCards.map((c) => c.kind);
    expect(kinds.some((k) => ['hero', 'match', 'fact', 'group'].includes(k))).toBe(true);
  });
});
