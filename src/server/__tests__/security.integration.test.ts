// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestServer, teardownTestServer } from '../testHarness';
import { adminToken, createPlayer, loginPlayer, loginPlayerReady } from './authHelpers';
import { groupMatches } from '../../data/tournament';
import { teams } from '../../data/tournament';
import type { Express } from 'express';

let app: Express;

beforeEach(async () => {
  app = await setupTestServer();
});

afterAll(async () => {
  await teardownTestServer();
});

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

  it('rejects player creation without admin', async () => {
    await createPlayer(app, 'Regular');
    const token = await loginPlayerReady(app, 'Regular');

    const res = await request(app)
      .post('/api/admin/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Hacker', initialPassword: 'x' });
    expect(res.status).toBe(403);
  });

  it('rejects duplicate display names case-insensitively', async () => {
    await createPlayer(app, 'UniqueName');
    const admin = await adminToken(app);
    const dup = await request(app)
      .post('/api/admin/players')
      .set('Authorization', `Bearer ${admin}`)
      .send({ displayName: 'uniquename', initialPassword: 'b' });
    expect(dup.status).toBe(400);
    expect(String(dup.body.error)).toMatch(/already taken/i);
  });

  it('rejects absurdly high scores from tampered API requests', async () => {
    await createPlayer(app, 'HighScore');
    const token = await loginPlayerReady(app, 'HighScore');

    const res = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 999, awayScore: 0 });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/20|exceed/i);
  });

  it('rejects negative and non-integer scores with clear errors', async () => {
    await createPlayer(app, 'BadScore');
    const token = await loginPlayerReady(app, 'BadScore');

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
    await createPlayer(app, 'FakeMatch');
    const token = await loginPlayerReady(app, 'FakeMatch');

    const res = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'not-a-real-fixture', homeScore: 1, awayScore: 0 });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/not found/i);
  });

  it('rejects invalid tournament bonus team IDs', async () => {
    await createPlayer(app, 'BadBonus');
    const token = await loginPlayerReady(app, 'BadBonus');

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
    await createPlayer(app, 'GoodBonus');
    const token = await loginPlayerReady(app, 'GoodBonus');

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
    await createPlayer(app, 'Regular');
    const token = await loginPlayerReady(app, 'Regular');

    const unauth = await request(app).post('/api/system/locks/run');
    expect(unauth.status).toBe(401);

    const nonAdmin = await request(app)
      .post('/api/system/locks/run')
      .set('Authorization', `Bearer ${token}`);
    expect(nonAdmin.status).toBe(403);
  });

  it('allows admin to run system locks', async () => {
    const token = await adminToken(app);

    const res = await request(app)
      .post('/api/system/locks/run')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('blocks non-admin from all admin API routes', async () => {
    await createPlayer(app, 'NotAdmin');
    const token = await loginPlayerReady(app, 'NotAdmin');

    const routes = [
      ['get', '/api/admin/players'],
      ['post', '/api/admin/players', { displayName: 'Hack', initialPassword: 'ab' }],
      ['get', '/api/admin/sync-status'],
      ['post', '/api/admin/sync/run'],
      ['get', '/api/admin/mapping-diagnostics'],
      ['post', '/api/admin/fixtures/sync'],
      [
        'post',
        '/api/admin/results/override',
        { matchId: 'g-a-1', homeScore: 3, awayScore: 0, status: 'FINISHED' }
      ],
      ['post', '/api/admin/leaderboard/recompute']
    ] as const;

    for (const entry of routes) {
      const method = entry[0];
      const path = entry[1];
      const body = entry[2];
      let req = request(app)[method](path).set('Authorization', `Bearer ${token}`);
      if (body !== undefined) req = req.send(body);
      const res = await req;
      expect(res.status).toBe(403);
    }
  });

  it('hides other players group picks before global lock', async () => {
    await createPlayer(app, 'Alice');
    await createPlayer(app, 'Bob');
    const tokenAlice = await loginPlayerReady(app, 'Alice');
    const tokenBob = await loginPlayerReady(app, 'Bob');

    await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${tokenAlice}`)
      .send({ matchId: 'g-a-1', homeScore: 2, awayScore: 1 });

    const cmp = await request(app)
      .get('/api/comparison/g-a-1')
      .set('Authorization', `Bearer ${tokenBob}`);
    expect(cmp.status).toBe(200);

    const alice = cmp.body.entries.find((e: { displayName: string }) => e.displayName === 'Alice');
    expect(alice.hidden).toBe(true);
    expect(alice.pick).toBeNull();
    expect(cmp.body.visibility.canViewOthers).toBe(false);
  });

  it('isolates picks per user', async () => {
    await createPlayer(app, 'OwnerA');
    await createPlayer(app, 'OwnerB');
    const tokenA = await loginPlayerReady(app, 'OwnerA');
    const tokenB = await loginPlayerReady(app, 'OwnerB');

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

  it('locks a group with implicit 0-0 draws for untouched matches', async () => {
    await createPlayer(app, 'PartialLock');
    const token = await loginPlayerReady(app, 'PartialLock');

    await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 1, awayScore: 0 });

    const lock = await request(app)
      .post('/api/predictions/groups/A/lock')
      .set('Authorization', `Bearer ${token}`);
    expect(lock.status).toBe(200);

    const state = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    expect(state.body.acceptedGroups).toContain('A');
    expect(state.body.committedPicks['g-a-2']).toMatchObject({ homeScore: 0, awayScore: 0 });
  });

  it('blocks edits after global auto-lock', async () => {
    await createPlayer(app, 'GlobalLock');
    const token = await loginPlayerReady(app, 'GlobalLock');

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
    await createPlayer(app, 'Stress');
    const token = await loginPlayerReady(app, 'Stress');

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
    expect(state.body.committedPicks['g-c-1'].homeScore).toBeLessThanOrEqual(20);
  });

  it('enforces 72-pick gate before knockout saves', async () => {
    await createPlayer(app, 'KoGate2');
    const token = await loginPlayerReady(app, 'KoGate2');

    const res = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'r32-1', homeScore: 2, awayScore: 1 });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/72/);
  });

  it('blocks KO save until fixture confirmed after all group picks', async () => {
    await createPlayer(app, 'KoFull');
    const token = await loginPlayerReady(app, 'KoFull');

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

  it('accepts player passwords up to 30 characters', async () => {
    await createPlayer(app, 'LongPass', 'tmp1');
    const token = await loginPlayer(app, 'LongPass', 'tmp1');
    const longPassword = 'Mix3d!Pass'.padEnd(30, '0');
    expect(longPassword.length).toBe(30);

    const change = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'tmp1', newPassword: longPassword });
    expect(change.status).toBe(200);

    const relogin = await request(app)
      .post('/api/auth/login')
      .send({ displayName: 'LongPass', password: longPassword });
    expect(relogin.status).toBe(200);
  });

  it('rejects player passwords longer than 30 characters', async () => {
    await createPlayer(app, 'TooLong', 'tmp2');
    const token = await loginPlayer(app, 'TooLong', 'tmp2');
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'tmp2', newPassword: 'x'.repeat(31) });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/30/);
  });

  it('rejects creating a player with the reserved admin username', async () => {
    const token = await adminToken(app);
    const res = await request(app)
      .post('/api/admin/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'AdminTomsom', initialPassword: 'x' });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/reserved/i);
  });

  it('blocks admin from prediction APIs and leaderboard inclusion', async () => {
    const token = await adminToken(app);
    const draft = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 1, awayScore: 0 });
    expect(draft.status).toBe(403);
    expect(String(draft.body.error)).toMatch(/Admin accounts cannot/i);

    const state = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    expect(state.status).toBe(403);

    const board = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${token}`);
    expect(board.status).toBe(200);
    const names = board.body.entries.map((entry: { name: string }) => entry.name);
    expect(names).not.toContain('AdminTomsom');
  });

  it('excludes admin from comparison player list', async () => {
    await createPlayer(app, 'CompareA');
    const playerToken = await loginPlayerReady(app, 'CompareA');
    const cmp = await request(app)
      .get('/api/comparison/g-a-1')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(cmp.status).toBe(200);
    const names = cmp.body.entries.map((e: { displayName: string }) => e.displayName);
    expect(names).not.toContain('AdminTomsom');
  });

  it('requires password change before predictions', async () => {
    await createPlayer(app, 'MustChange', 'init1');
    const token = await loginPlayer(app, 'MustChange', 'init1');

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.mustChangePassword).toBe(true);
  });
});
