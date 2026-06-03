// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestServer, teardownTestServer } from '../testHarness';
import type { Express } from 'express';

const JOIN_PASSWORD = 'MadSlags1';

let app: Express;

beforeEach(async () => {
  app = await setupTestServer();
});

afterAll(async () => {
  await teardownTestServer();
});

function registerPayload(displayName: string, password = 'abc') {
  return { displayName, password, joinPassword: JOIN_PASSWORD };
}

describe('API integration', () => {
  it('registers, logs in, saves draft, commits, and reads leaderboard', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send(registerPayload('Alice'));
    expect(register.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'Alice', password: 'abc' });
    expect(login.status).toBe(200);
    const token = login.body.token as string;
    expect(token).toBeTruthy();

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
    expect(leaderboard.body).toHaveLength(1);
    expect(leaderboard.body[0].name).toBe('Alice');
  });

  it('rejects registration without valid join password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ displayName: 'Bob', password: 'bob', joinPassword: 'wrong' });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/sign-up password/i);
  });

  it('rejects unauthenticated prediction access', async () => {
    const res = await request(app).get('/api/predictions/state');
    expect(res.status).toBe(401);
  });

  it('rejects knockout draft until fixture is officially confirmed', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('KO Fixture'));

    const login = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'KO Fixture', password: 'abc' });
    const token = login.body.token as string;

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
    await request(app).post('/api/auth/register').send(registerPayload('KO Gate'));

    const login = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'KO Gate', password: 'abc' });
    const token = login.body.token as string;

    const koDraft = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'r32-1', homeScore: 2, awayScore: 1 });
    expect(koDraft.status).toBe(400);
    expect(String(koDraft.body.error)).toMatch(/72/);
  });

  it('locks and unlocks a group so per-group edits are blocked then restored', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('GroupLock'));

    const login = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'GroupLock', password: 'abc' });
    const token = login.body.token as string;

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
    await request(app).post('/api/auth/register').send(registerPayload('ResultLock'));

    const login = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'ResultLock', password: 'abc' });
    const token = login.body.token as string;

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
    await request(app).post('/api/auth/register').send(registerPayload('Locked'));

    const login = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'Locked', password: 'abc' });
    const token = login.body.token as string;

    const { runAutoLocks } = await import('../services/predictions');
    await runAutoLocks('2026-06-12T00:00:00Z');

    const draft = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 1, awayScore: 0 });
    expect(draft.status).toBe(400);
    expect(String(draft.body.error)).toMatch(/locked/i);
  });

  it('returns mapping diagnostics for admin', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('Diag'));

    const { getDb } = await import('../database');
    await getDb().run(`UPDATE users SET is_admin = 1 WHERE display_name = ?`, ['Diag']);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'Diag', password: 'abc' });
    const token = login.body.token as string;

    const res = await request(app)
      .get('/api/admin/mapping-diagnostics')
      .set('Authorization', `Bearer ${token}`);

    if (process.env.FOOTBALL_DATA_TOKEN) {
      expect(res.status).toBe(200);
      expect(res.body.summary.groupStageTotal).toBe(72);
      expect(res.body.totals.providerFixtures).toBe(104);
    } else {
      expect(res.status).toBe(400);
    }
  });

  it('saves tournament bonus picks before group stage is complete', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('Bonus Early'));

    const login = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'Bonus Early', password: 'abc' });
    const token = login.body.token as string;

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

  it('returns health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('allows admin result override when is_admin set', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('Admin'));

    const { getDb } = await import('../database');
    await getDb().run(`UPDATE users SET is_admin = 1 WHERE display_name = ?`, ['Admin']);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'Admin', password: 'abc' });
    const token = login.body.token as string;

    const override = await request(app)
      .post('/api/admin/results/override')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 3, awayScore: 0, status: 'FINISHED' });
    expect(override.status).toBe(200);

    const leaderboard = await request(app).get('/api/leaderboard');
    expect(leaderboard.status).toBe(200);
  });
});
