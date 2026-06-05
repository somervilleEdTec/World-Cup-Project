// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestServer, teardownTestServer } from '../testHarness';
import {
  adminToken,
  createPlayer,
  loginPlayerReady
} from './authHelpers';
import {
  adminOverrideResult,
  insertGroupResults,
  insertAllGroupResults,
  saveAllGroupPicks
} from './testDbHelpers';
import { getDb } from '../database';
import { buildConfirmedKnockoutFixtures } from '../../lib/knockoutFixtureAvailability';
import { getResultsMap } from '../services/leaderboard';
import { picksFromActuals } from '../../lib/pickUtils';
import { groupMatches } from '../../data/tournament';
import type { Express } from 'express';

let app: Express;

beforeEach(async () => {
  app = await setupTestServer();
});

afterAll(async () => {
  await teardownTestServer();
});

describe('tournament integration — DB and leaderboard', () => {
  it('awards exact group match points when official result matches pick', async () => {
    await createPlayer(app, 'Scorer');
    const token = await loginPlayerReady(app, 'Scorer');
    const admin = await adminToken(app);

    await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'g-a-1', homeScore: 2, awayScore: 1 });

    await adminOverrideResult(app, admin, 'g-a-1', 2, 1);

    const board = await request(app).get('/api/leaderboard');
    expect(board.status).toBe(200);
    const entry = board.body.entries.find((e: { name: string }) => e.name === 'Scorer');
    expect(entry.points).toBe(6);
    expect(entry.exactScorePoints).toBe(4);
    expect(entry.correctResultPoints).toBe(2);
  });

  it('exposes confirmed knockout fixtures after feeding groups finish in DB', async () => {
    await createPlayer(app, 'KoViewer');
    const token = await loginPlayerReady(app, 'KoViewer');
    const db = getDb();
    await insertGroupResults(db, 'A');
    await insertGroupResults(db, 'B');

    const state = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    expect(state.status).toBe(200);
    expect(state.body.confirmedKnockoutFixtures.some((m: { id: string }) => m.id === 'r32-1')).toBe(
      true
    );

    const actuals = await getResultsMap();
    expect(buildConfirmedKnockoutFixtures(actuals).some((m) => m.id === 'r32-1')).toBe(true);
  });

  it('allows knockout save once 72 group picks and feeder group results exist', async () => {
    await createPlayer(app, 'KoPicker');
    const token = await loginPlayerReady(app, 'KoPicker');
    const admin = await adminToken(app);

    await saveAllGroupPicks(app, token);
    const db = getDb();
    await insertGroupResults(db, 'A');
    await insertGroupResults(db, 'B');

    const actuals = await getResultsMap();
    const confirmed = buildConfirmedKnockoutFixtures(actuals);
    const r32 = confirmed.find((m) => m.id === 'r32-1');
    expect(r32).toBeTruthy();

    const koSave = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'r32-1', homeScore: 2, awayScore: 0 });
    expect(koSave.status).toBe(200);

    const state = await request(app)
      .get('/api/predictions/state')
      .set('Authorization', `Bearer ${token}`);
    expect(state.body.committedPicks['r32-1']).toMatchObject({ homeScore: 2, awayScore: 0 });
  });

  it('ranks players by points with deterministic tie-break metadata', async () => {
    await createPlayer(app, 'LeaderA');
    await createPlayer(app, 'LeaderB');
    const tokenA = await loginPlayerReady(app, 'LeaderA');
    const tokenB = await loginPlayerReady(app, 'LeaderB');
    const admin = await adminToken(app);

    await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ matchId: 'g-a-1', homeScore: 2, awayScore: 1 });
    await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ matchId: 'g-a-1', homeScore: 0, awayScore: 0 });

    await adminOverrideResult(app, admin, 'g-a-1', 2, 1);

    const board = await request(app).get('/api/leaderboard');
    expect(board.body.entries[0].name).toBe('LeaderA');
    expect(board.body.entries[0].points).toBeGreaterThan(board.body.entries[1].points);
    expect(board.body.entries[0].exactScorePoints).toBeGreaterThanOrEqual(4);
  });

  it('persists results upsert without duplicating rows', async () => {
    const admin = await adminToken(app);
    await adminOverrideResult(app, admin, 'g-b-1', 1, 0);
    await adminOverrideResult(app, admin, 'g-b-1', 3, 2);

    const db = getDb();
    const rows = await db.all<{ match_id: string; home_score: number; away_score: number }>(
      `SELECT match_id, home_score, away_score FROM results WHERE match_id = 'g-b-1'`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].home_score).toBe(3);
    expect(rows[0].away_score).toBe(2);
  });

  it('stores progressing team on knockout draw results from admin override', async () => {
    const admin = await adminToken(app);
    await insertAllGroupResults();

    const actualsBefore = await getResultsMap();
    const r32 = buildConfirmedKnockoutFixtures(actualsBefore)[0];
    expect(r32).toBeTruthy();

    await adminOverrideResult(app, admin, r32!.id, 1, 1, r32!.homeTeamId);

    const actuals = await getResultsMap();
    expect(actuals[r32!.id].progressingTeamId).toBe(r32!.homeTeamId);
    expect(picksFromActuals(actuals)[r32!.id].progressingTeamId).toBe(r32!.homeTeamId);
  });
});

describe('tournament integration — stress', () => {
  it('handles ten players saving full group cards without cross-user contamination', async () => {
    const tokens: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      await createPlayer(app, `Bulk${i}`);
      tokens.push(await loginPlayerReady(app, `Bulk${i}`));
    }

    await Promise.all(
      tokens.map((token, playerIdx) =>
        Promise.all(
          groupMatches.map((match, matchIdx) =>
            request(app)
              .post('/api/predictions/draft')
              .set('Authorization', `Bearer ${token}`)
              .send({
                matchId: match.id,
                homeScore: playerIdx % 4,
                awayScore: matchIdx % 3
              })
          )
        )
      )
    );

    const board = await request(app).get('/api/leaderboard');
    expect(board.body.entries).toHaveLength(10);

    for (let i = 0; i < 10; i += 1) {
      const state = await request(app)
        .get('/api/predictions/state')
        .set('Authorization', `Bearer ${tokens[i]}`);
      expect(Object.keys(state.body.committedPicks)).toHaveLength(72);
    }
  });
});
