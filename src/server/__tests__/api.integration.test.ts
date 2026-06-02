// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestServer, teardownTestServer } from '../testHarness';
import type { Express } from 'express';

let app: Express;

beforeEach(async () => {
  app = await setupTestServer();
});

afterAll(async () => {
  await teardownTestServer();
});

describe('API integration', () => {
  it('registers, logs in, saves draft, commits, and reads leaderboard', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password1', displayName: 'Alice' });
    expect(register.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password1' });
    expect(login.status).toBe(200);
    const token = login.body.token as string;
    expect(token).toBeTruthy();

    const draft = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 2, awayScore: 1 });
    expect(draft.status).toBe(200);

    const beforeCommit = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    const affected = (beforeCommit.body.affectedMatches as string[]) ?? [];
    for (const matchId of affected) {
      const review = await request(app)
        .post(`/api/predictions/review/${matchId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(review.status).toBe(200);
    }

    const commit = await request(app)
      .post('/api/predictions/commit')
      .set('Authorization', `Bearer ${token}`);
    expect(commit.status).toBe(200);

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

  it('rejects unauthenticated prediction access', async () => {
    const res = await request(app).get('/api/predictions/state');
    expect(res.status).toBe(401);
  });

  it('rejects knockout draft until all group picks are committed', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'ko-gate@example.com', password: 'password1', displayName: 'KO Gate' });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ko-gate@example.com', password: 'password1' });
    const token = login.body.token as string;

    const koDraft = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'r32-1', homeScore: 2, awayScore: 1 });
    expect(koDraft.status).toBe(400);
    expect(String(koDraft.body.error)).toMatch(/72/);
  });

  it('rejects group draft saves after group lock time', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'locked@example.com', password: 'password1', displayName: 'Locked' });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'locked@example.com', password: 'password1' });
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

  it('returns health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('allows admin result override when is_admin set', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin@example.com', password: 'password1', displayName: 'Admin' });

    const { getDb } = await import('../database');
    await getDb().run(`UPDATE users SET is_admin = 1 WHERE email = ?`, ['admin@example.com']);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password1' });
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
