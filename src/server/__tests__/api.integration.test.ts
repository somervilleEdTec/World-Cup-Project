// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { getFootballDataToken } from '../../lib/runtimeConfig';
import { setupTestServer, teardownTestServer } from '../testHarness';
import { adminToken, createPlayer, loginPlayerReady } from './authHelpers';
import type { Express } from 'express';

let app: Express;

beforeEach(async () => {
  app = await setupTestServer();
});

afterAll(async () => {
  await teardownTestServer();
});

describe('API integration', () => {
  it('admin creates player, player changes password, saves picks, leaderboard', async () => {
    await createPlayer(app, 'Alice', 'abc');
    const token = await loginPlayerReady(app, 'Alice', 'abc', 'xyz');

    const draft = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 2, awayScore: 1 });
    expect(draft.status).toBe(200);

    const state = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    expect(state.status).toBe(200);
    expect(state.body.committedPicks['g-a-1']).toMatchObject({ homeScore: 2, awayScore: 1 });

    const leaderboard = await request(app).get('/api/leaderboard');
    expect(leaderboard.status).toBe(200);
    expect(leaderboard.body.entries).toHaveLength(1);
    expect(leaderboard.body.entries[0].name).toBe('Alice');
  });

  it('blocks predictions until forced password change', async () => {
    await createPlayer(app, 'Newbie', 'tmp');
    const login = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'Newbie', password: 'tmp' });
    const token = login.body.token as string;

    const blocked = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 1, awayScore: 0 });
    expect(blocked.status).toBe(403);
    expect(String(blocked.body.error)).toMatch(/PASSWORD_CHANGE_REQUIRED/i);
  });

  it('rejects unauthenticated prediction access', async () => {
    const res = await request(app).get('/api/predictions/state');
    expect(res.status).toBe(401);
  });

  it('rejects knockout draft until fixture is officially confirmed', async () => {
    await createPlayer(app, 'KO Fixture');
    const token = await loginPlayerReady(app, 'KO Fixture');

    const { groupMatches } = await import('../../data/tournament');
    for (const match of groupMatches) {
      const draft = await request(app)
        .post('/api/predictions/draft')
        .set('Authorization', `Bearer ${token}`)
        .send({ matchId: match.id, homeScore: 1, awayScore: 0 });
      expect(draft.status).toBe(200);
    }
    const commit = await request(app)
      .post('/api/predictions/commit')
      .set('Authorization', `Bearer ${token}`);
    expect(commit.status).toBe(200);

    const unconfirmed = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'r32-1', homeScore: 2, awayScore: 1 });
    expect(unconfirmed.status).toBe(400);
    expect(String(unconfirmed.body.error)).toMatch(/not available yet/i);
  });

  it('rejects knockout draft until all group picks are committed', async () => {
    await createPlayer(app, 'KO Gate');
    const token = await loginPlayerReady(app, 'KO Gate');

    const koDraft = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'r32-1', homeScore: 2, awayScore: 1 });
    expect(koDraft.status).toBe(400);
    expect(String(koDraft.body.error)).toMatch(/72/);
  });

  it('locks and unlocks a group so per-group edits are blocked then restored', async () => {
    await createPlayer(app, 'GroupLock');
    const token = await loginPlayerReady(app, 'GroupLock');

    const { groupMatches } = await import('../../data/tournament');
    const groupAMatches = groupMatches.filter((m) => m.group === 'A');
    for (const match of groupAMatches) {
      const draft = await request(app)
        .post('/api/predictions/draft')
        .set('Authorization', `Bearer ${token}`)
        .send({ matchId: match.id, homeScore: 1, awayScore: 0 });
      expect(draft.status).toBe(200);
    }

    const lock = await request(app)
      .post('/api/predictions/groups/A/lock')
      .set('Authorization', `Bearer ${token}`);
    expect(lock.status).toBe(200);

    const blocked = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 3, awayScore: 0 });
    expect(blocked.status).toBe(400);
    expect(String(blocked.body.error)).toMatch(/Group A is locked/i);

    const unlock = await request(app)
      .post('/api/predictions/groups/A/unlock')
      .set('Authorization', `Bearer ${token}`);
    expect(unlock.status).toBe(200);

    const allowed = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 3, awayScore: 0 });
    expect(allowed.status).toBe(200);

    const state = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    expect(state.body.committedPicks['g-a-1']).toMatchObject({ homeScore: 3, awayScore: 0 });
  });

  it('rejects group unlock and edits when official results exist', async () => {
    await createPlayer(app, 'ResultLock');
    const token = await loginPlayerReady(app, 'ResultLock');

    const { groupMatches } = await import('../../data/tournament');
    const groupAMatches = groupMatches.filter((m) => m.group === 'A');
    for (const match of groupAMatches) {
      const draft = await request(app)
        .post('/api/predictions/draft')
        .set('Authorization', `Bearer ${token}`)
        .send({ matchId: match.id, homeScore: 1, awayScore: 0 });
      expect(draft.status).toBe(200);
    }

    const lock = await request(app)
      .post('/api/predictions/groups/A/lock')
      .set('Authorization', `Bearer ${token}`);
    expect(lock.status).toBe(200);

    const { getDb } = await import('../database');
    await getDb().run(
      `INSERT INTO results (match_id, home_score, away_score, progressing_team_id, status, source, updated_at)
       VALUES (?, ?, ?, NULL, 'FINISHED', 'test', ?)`,
      ['g-a-1', 2, 1, new Date().toISOString()]
    );

    const unlock = await request(app)
      .post('/api/predictions/groups/A/unlock')
      .set('Authorization', `Bearer ${token}`);
    expect(unlock.status).toBe(400);
    expect(String(unlock.body.error)).toMatch(/cannot be unlocked/i);

    const blocked = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 3, awayScore: 0 });
    expect(blocked.status).toBe(400);
    expect(String(blocked.body.error)).toMatch(/official result/i);
  });

  it('rejects group draft saves after group lock time', async () => {
    await createPlayer(app, 'Locked');
    const token = await loginPlayerReady(app, 'Locked');

    const { runAutoLocks } = await import('../services/predictions');
    await runAutoLocks('2026-06-12T00:00:00Z');

    const state = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    expect(state.body.committedPicks['g-a-1']).toMatchObject({ homeScore: 0, awayScore: 0 });

    const draft = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 1, awayScore: 0 });
    expect(draft.status).toBe(400);
    expect(String(draft.body.error)).toMatch(/locked/i);
  });

  it('returns mapping diagnostics for bootstrap admin', async () => {
    const token = await adminToken(app);

    const res = await request(app)
      .get('/api/admin/mapping-diagnostics')
      .set('Authorization', `Bearer ${token}`);

    if (getFootballDataToken()) {
      expect(res.status).toBe(200);
      expect(res.body.summary.groupStageTotal).toBe(72);
      expect(res.body.totals.providerFixtures).toBe(104);
    } else {
      expect(res.status).toBe(400);
    }
  });

  it('saves tournament bonus picks before group stage is complete', async () => {
    await createPlayer(app, 'Bonus Early');
    const token = await loginPlayerReady(app, 'Bonus Early');

    const { teams } = await import('../../data/tournament');
    const bonus = await request(app)
      .post('/api/predictions/bonus')
      .set('Authorization', `Bearer ${token}`)
      .send({
        winnerTeamId: teams[0].id,
        runnerUpTeamId: teams[1].id,
        thirdTeamId: teams[2].id,
        fourthTeamId: teams[3].id
      });
    expect(bonus.status).toBe(200);

    const state = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    expect(state.body.bonusCommitted).toBeTruthy();
    expect(state.body.bonusDraft).toBeUndefined();
  });

  it('returns statistics API with crowdCards shape', async () => {
    await createPlayer(app, 'Stats A', 'abc');
    await createPlayer(app, 'Stats B', 'abc');
    const tokenA = await loginPlayerReady(app, 'Stats A', 'abc', 'xyz');
    const tokenB = await loginPlayerReady(app, 'Stats B', 'abc', 'xyz');

    for (const matchId of ['g-a-1', 'g-a-2']) {
      await request(app)
        .post('/api/predictions/draft')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ matchId, homeScore: 2, awayScore: 1 });
      await request(app)
        .post('/api/predictions/draft')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ matchId, homeScore: 2, awayScore: 1 });
    }

    const res = await request(app).get('/api/statistics');
    expect(res.status).toBe(200);
    expect(res.body.meta.playerCount).toBe(2);
    expect(typeof res.body.meta.groupPhaseLocked).toBe('boolean');
    expect(typeof res.body.meta.upcomingFixtureCount).toBe('number');
    expect(Array.isArray(res.body.crowdCards)).toBe(true);
    expect(res.body.meta.cardCount).toBe(res.body.crowdCards.length);
    if (res.body.crowdCards.length > 0) {
      expect(res.body.crowdCards[0]).toHaveProperty('id');
      expect(res.body.crowdCards[0]).toHaveProperty('kind');
    }
  });

  it('returns health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('allows bootstrap admin result override', async () => {
    const token = await adminToken(app);

    const override = await request(app)
      .post('/api/admin/results/override')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 3, awayScore: 0, status: 'FINISHED' });
    expect(override.status).toBe(200);

    const leaderboard = await request(app).get('/api/leaderboard');
    expect(leaderboard.status).toBe(200);
  });
});
