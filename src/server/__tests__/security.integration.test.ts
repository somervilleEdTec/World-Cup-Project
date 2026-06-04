// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestServer, teardownTestServer } from '../testHarness';
import { groupMatches } from '../../data/tournament';
import { teams } from '../../data/tournament';
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

async function loginToken(displayName: string, password = 'abc'): Promise<string> {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ displayName, password });
  expect(login.status).toBe(200);
  return login.body.token as string;
}

describe('security and tamper resistance', () => {
  it('rejects unauthenticated access to prediction state', async () => {
    const res = await request(app).get('/api/predictions/state');
    expect(res.status).toBe(401);
  });

  it('rejects invalid bearer tokens', async () => {
    const res = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', 'Bearer not-a-real-session');
    expect(res.status).toBe(401);
  });

  it('rejects registration with wrong join password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ displayName: 'Intruder', password: 'x', joinPassword: 'wrong' });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/sign-up password/i);
  });

  it('rejects duplicate display names case-insensitively', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('UniqueName'));
    const dup = await request(app)
      .post('/api/auth/register')
      .send(registerPayload('uniquename'));
    expect(dup.status).toBe(400);
    expect(String(dup.body.error)).toMatch(/already taken/i);
  });

  it('rejects absurdly high scores from tampered API requests', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('HighScore'));
    const token = await loginToken('HighScore');

    const res = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 999, awayScore: 0 });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/20|exceed/i);
  });

  it('rejects negative and non-integer scores with clear errors', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('BadScore'));
    const token = await loginToken('BadScore');

    const negative = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: -1, awayScore: 0 });
    expect(negative.status).toBe(400);
    expect(String(negative.body.error)).toMatch(/0 and 20/i);

    const float = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 1.5, awayScore: 0 });
    expect(float.status).toBe(400);
    expect(String(float.body.error)).toMatch(/0 and 20/i);
  });

  it('rejects unknown match IDs', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('FakeMatch'));
    const token = await loginToken('FakeMatch');

    const res = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'not-a-real-fixture', homeScore: 1, awayScore: 0 });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/not found/i);
  });

  it('rejects invalid tournament bonus team IDs', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('BadBonus'));
    const token = await loginToken('BadBonus');

    const res = await request(app)
      .post('/api/predictions/bonus')
      .set('Authorization', `Bearer ${token}`)
      .send({
        winnerTeamId: 'fake-team',
        runnerUpTeamId: 'also-fake',
        thirdTeamId: 'nope',
        fourthTeamId: 'invalid'
      });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/unknown team/i);
  });

  it('accepts valid tournament bonus team IDs', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('GoodBonus'));
    const token = await loginToken('GoodBonus');

    const res = await request(app)
      .post('/api/predictions/bonus')
      .set('Authorization', `Bearer ${token}`)
      .send({
        winnerTeamId: teams[0].id,
        runnerUpTeamId: teams[1].id,
        thirdTeamId: teams[2].id,
        fourthTeamId: teams[3].id
      });
    expect(res.status).toBe(200);
  });

  it('blocks non-admin from system lock endpoint', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('Regular'));
    const token = await loginToken('Regular');

    const unauth = await request(app).post('/api/system/locks/run');
    expect(unauth.status).toBe(401);

    const nonAdmin = await request(app)
      .post('/api/system/locks/run')
      .set('Authorization', `Bearer ${token}`);
    expect(nonAdmin.status).toBe(403);
  });

  it('allows admin to run system locks', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('LockAdmin'));
    const { getDb } = await import('../database');
    await getDb().run(`UPDATE users SET is_admin = 1 WHERE display_name = ?`, ['LockAdmin']);
    const token = await loginToken('LockAdmin');

    const res = await request(app)
      .post('/api/system/locks/run')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('blocks non-admin from result override', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('NotAdmin'));
    const token = await loginToken('NotAdmin');

    const res = await request(app)
      .post('/api/admin/results/override')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 3, awayScore: 0, status: 'FINISHED' });
    expect(res.status).toBe(403);
  });

  it('hides other players group picks before global lock', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('Alice'));
    await request(app).post('/api/auth/register').send(registerPayload('Bob'));

    const tokenAlice = await loginToken('Alice');
    const tokenBob = await loginToken('Bob');

    await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({ matchId: 'g-a-1', homeScore: 2, awayScore: 1 });

    const cmp = await request(app)
      .get('/api/comparison/g-a-1')
      .set('Authorization', `Bearer ${tokenBob}`);
    expect(cmp.status).toBe(200);

    const alice = cmp.body.entries.find(
      (e: { displayName: string }) => e.displayName === 'Alice'
    );
    const bob = cmp.body.entries.find((e: { displayName: string }) => e.displayName === 'Bob');
    expect(alice.hidden).toBe(true);
    expect(alice.pick).toBeNull();
    expect(bob.isCurrentUser).toBe(true);
    expect(cmp.body.visibility.canViewOthers).toBe(false);
  });

  it('isolates picks per user — Bob cannot overwrite Alice state', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('OwnerA'));
    await request(app).post('/api/auth/register').send(registerPayload('OwnerB'));

    const tokenA = await loginToken('OwnerA');
    const tokenB = await loginToken('OwnerB');

    await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ matchId: 'g-a-1', homeScore: 3, awayScore: 1 });

    await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ matchId: 'g-a-1', homeScore: 0, awayScore: 5 });

    const stateA = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${tokenA}`);
    const stateB = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(stateA.body.committedPicks['g-a-1']).toMatchObject({ homeScore: 3, awayScore: 1 });
    expect(stateB.body.committedPicks['g-a-1']).toMatchObject({ homeScore: 0, awayScore: 5 });
  });

  it('rejects group lock until all six group matches are saved', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('PartialLock'));
    const token = await loginToken('PartialLock');

    await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 1, awayScore: 0 });

    const lock = await request(app)
      .post('/api/predictions/groups/A/lock')
      .set('Authorization', `Bearer ${token}`);
    expect(lock.status).toBe(400);
    expect(String(lock.body.error)).toMatch(/Complete all matches/i);
  });

  it('blocks edits after global auto-lock', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('GlobalLock'));
    const token = await loginToken('GlobalLock');

    const { runAutoLocks } = await import('../services/predictions');
    await runAutoLocks('2026-06-12T00:00:00Z');

    const draft = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 1, awayScore: 0 });
    expect(draft.status).toBe(400);
    expect(String(draft.body.error)).toMatch(/locked/i);
  });

  it('survives rapid concurrent saves on the same fixture', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('Stress'));
    const token = await loginToken('Stress');

    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        request(app)
          .post('/api/predictions/draft')
          .set('Authorization', `Bearer ${token}`)
          .send({ matchId: 'g-c-1', homeScore: i % 6, awayScore: 0 })
      )
    );
    expect(results.every((r) => r.status === 200)).toBe(true);

    const state = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    expect(state.body.committedPicks['g-c-1']).toBeDefined();
    expect(state.body.committedPicks['g-c-1'].homeScore).toBeGreaterThanOrEqual(0);
    expect(state.body.committedPicks['g-c-1'].homeScore).toBeLessThanOrEqual(20);
  });

  it('enforces 72-pick gate before knockout saves', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('KoGate2'));
    const token = await loginToken('KoGate2');

    const res = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'r32-1', homeScore: 2, awayScore: 1 });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/72/);
  });

  it('allows knockout save only after all 72 group picks committed', async () => {
    await request(app).post('/api/auth/register').send(registerPayload('KoFull'));
    const token = await loginToken('KoFull');

    for (const match of groupMatches) {
      const draft = await request(app)
        .post('/api/predictions/draft')
        .set('Authorization', `Bearer ${token}`)
        .send({ matchId: match.id, homeScore: 1, awayScore: 0 });
      expect(draft.status).toBe(200);
    }

    const ko = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'r32-1', homeScore: 2, awayScore: 1 });
    expect(ko.status).toBe(400);
    expect(String(ko.body.error)).toMatch(/not available yet/i);
  });
});
