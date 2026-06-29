// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { setupTestServer, teardownTestServer } from '../testHarness';
import { createPlayer } from './authHelpers';
import { computeOverallPicks } from '../services/overallPicks';
import { computeLeaderboard } from '../services/leaderboard';
import { setBonusDraft } from '../services/predictions';
import { getDb } from '../database';
import type { Express } from 'express';

const PRE_LOCK_NOW = '2026-06-11T18:00:00Z';
const POST_LOCK_NOW = '2026-06-12T01:00:00Z';

const BONUS_A = {
  winnerTeamId: 'brazil',
  runnerUpTeamId: 'france',
  thirdTeamId: 'argentina',
  fourthTeamId: 'england'
};

const BONUS_B = {
  winnerTeamId: 'spain',
  runnerUpTeamId: 'germany',
  thirdTeamId: 'portugal',
  fourthTeamId: 'netherlands'
};

let app: Express;

beforeEach(async () => {
  app = await setupTestServer();
});

afterAll(async () => {
  await teardownTestServer();
});

async function seedPlayersWithBonus() {
  await createPlayer(app, 'Overall A', 'abc');
  await createPlayer(app, 'Overall B', 'abc');

  const db = getDb();
  const users = await db.all<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM users WHERE display_name IN ('Overall A', 'Overall B') ORDER BY display_name`
  );

  await setBonusDraft(users[0].id, BONUS_A, PRE_LOCK_NOW);
  await setBonusDraft(users[1].id, BONUS_B, PRE_LOCK_NOW);

  return users;
}

describe('computeOverallPicks', () => {
  it('orders entries the same as the leaderboard', async () => {
    await seedPlayersWithBonus();
    const { runAutoLocks } = await import('../services/predictions');
    await runAutoLocks('2026-06-12T00:00:00Z');

    const [overall, leaderboard] = await Promise.all([
      computeOverallPicks(POST_LOCK_NOW),
      computeLeaderboard()
    ]);

    expect(overall.entries.map((entry) => entry.userId)).toEqual(
      leaderboard.entries.map((entry) => entry.userId)
    );
    expect(overall.entries.map((entry) => entry.rank)).toEqual(
      leaderboard.entries.map((entry) => entry.rank)
    );
  });

  it('hides other players bonus picks before group lock', async () => {
    const users = await seedPlayersWithBonus();

    const overall = await computeOverallPicks(PRE_LOCK_NOW, users[0].id);
    const self = overall.entries.find((entry) => entry.userId === users[0].id);
    const other = overall.entries.find((entry) => entry.userId === users[1].id);

    expect(overall.meta.groupPhaseLocked).toBe(false);
    expect(self?.hidden).toBe(false);
    expect(self?.bonus).toEqual(BONUS_A);
    expect(other?.hidden).toBe(true);
    expect(other?.bonus).toBeUndefined();
  });

  it('reveals all bonus picks after group lock', async () => {
    await seedPlayersWithBonus();
    const { runAutoLocks } = await import('../services/predictions');
    await runAutoLocks('2026-06-12T00:00:00Z');

    const overall = await computeOverallPicks(POST_LOCK_NOW);
    expect(overall.meta.groupPhaseLocked).toBe(true);
    expect(overall.entries.every((entry) => !entry.hidden)).toBe(true);
    expect(overall.entries.some((entry) => entry.bonus?.winnerTeamId === 'brazil')).toBe(true);
    expect(overall.entries.some((entry) => entry.bonus?.winnerTeamId === 'spain')).toBe(true);
  });
});
