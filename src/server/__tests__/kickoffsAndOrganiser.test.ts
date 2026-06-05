// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import type { Express } from 'express';
import request from 'supertest';
import { setupTestServer, teardownTestServer } from '../testHarness';
import { getDb } from '../database';
import { refreshKickoffCache, repairOfficialGroupKickoffs } from '../kickoffs';
import { GROUP_STAGE_KICKOFFS } from '../../data/groupStageKickoffs';
import { getMatches } from '../../lib/matchResolver';
import { createPlayer, loginPlayerReady } from './authHelpers';
import { BOOTSTRAP_ADMIN_USERNAME } from '../services/auth';

let app: Express;

beforeEach(async () => {
  app = await setupTestServer();
});

afterAll(async () => {
  await teardownTestServer();
});

describe('kickoff cache and prediction fixtures', () => {
  it('ignores stale non-football-data group kickoffs in cache', async () => {
    const db = getDb();
    await db.run(
      `INSERT INTO match_kickoffs (match_id, kickoff, source, updated_at)
       VALUES ('g-a-3', '2026-06-12T16:00:00.000Z', 'static', datetime('now'))`
    );
    await refreshKickoffCache(db);
    const match = getMatches({}, {}).find((m) => m.id === 'g-a-3');
    expect(match?.kickoff).toBe(GROUP_STAGE_KICKOFFS['g-a-3']);
  });

  it('repairs official group kickoffs in the database on startup helper', async () => {
    const db = getDb();
    await db.run(
      `INSERT INTO match_kickoffs (match_id, kickoff, source, updated_at)
       VALUES ('g-l-1', '2026-06-22T16:00:00.000Z', 'static', datetime('now'))`
    );
    const updated = await repairOfficialGroupKickoffs(db);
    expect(updated).toBeGreaterThan(0);
    const row = await db.get<{ kickoff: string; source: string }>(
      `SELECT kickoff, source FROM match_kickoffs WHERE match_id = 'g-l-1'`
    );
    expect(row?.kickoff).toBe(GROUP_STAGE_KICKOFFS['g-l-1']);
    expect(row?.source).toBe('fifa-official-static');
  });

  it('returns server-resolved groupStageFixtures in prediction state', async () => {
    await createPlayer(app, 'KickoffViewer');
    const token = await loginPlayerReady(app, 'KickoffViewer');
    const res = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gA3 = res.body.groupStageFixtures.find((m: { id: string }) => m.id === 'g-a-3');
    expect(gA3.kickoff).toBe(GROUP_STAGE_KICKOFFS['g-a-3']);
  });
});

describe('organiser exclusion from competition views', () => {
  it('excludes bootstrap organiser name from leaderboard even when is_admin is unset', async () => {
    const db = getDb();
    await db.run(`UPDATE users SET is_admin = 0 WHERE LOWER(display_name) = LOWER(?)`, [
      BOOTSTRAP_ADMIN_USERNAME
    ]);

    const board = await request(app).get('/api/leaderboard');
    expect(board.status).toBe(200);
    const names = board.body.entries.map((entry: { name: string }) => entry.name);
    expect(names).not.toContain(BOOTSTRAP_ADMIN_USERNAME);
  });

  it('excludes bootstrap organiser name from comparison entries when is_admin is unset', async () => {
    await createPlayer(app, 'ComparePeer');
    const db = getDb();
    await db.run(`UPDATE users SET is_admin = 0 WHERE LOWER(display_name) = LOWER(?)`, [
      BOOTSTRAP_ADMIN_USERNAME
    ]);
    const token = await loginPlayerReady(app, 'ComparePeer');

    const cmp = await request(app)
      .get('/api/comparison/g-a-1')
      .set('Authorization', `Bearer ${token}`);
    expect(cmp.status).toBe(200);
    const names = cmp.body.entries.map((e: { displayName: string }) => e.displayName);
    expect(names).not.toContain(BOOTSTRAP_ADMIN_USERNAME);
  });
});
