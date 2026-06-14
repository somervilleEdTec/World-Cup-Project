// @vitest-environment node
import request from 'supertest';
import type { Express } from 'express';
import { groupMatches } from '../../data/tournament';
import { getDb } from '../database';
import type { DatabaseClient } from '../database/types';

export async function insertGroupResults(
  db: DatabaseClient,
  groupId: string,
  now = new Date().toISOString()
): Promise<void> {
  for (const match of groupMatches.filter((m) => m.group === groupId)) {
    await db.run(
      `INSERT INTO results (match_id, home_score, away_score, progressing_team_id, status, source, updated_at)
       VALUES (?, 1, 0, NULL, 'FINISHED', 'test', ?)
       ON CONFLICT(match_id) DO UPDATE SET
         home_score=excluded.home_score,
         away_score=excluded.away_score,
         progressing_team_id=excluded.progressing_team_id,
         status=excluded.status,
         source=excluded.source,
         updated_at=excluded.updated_at`,
      [match.id, now]
    );
  }
}

export async function insertAllGroupResults(now = new Date().toISOString()): Promise<void> {
  const db = getDb();
  for (const groupId of 'ABCDEFGHIJKL'.split('')) {
    await insertGroupResults(db, groupId, now);
  }
}

export async function saveAllGroupPicks(app: Express, token: string): Promise<void> {
  for (const match of groupMatches) {
    const res = await request(app)
      .post('/api/predictions/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: match.id, homeScore: 1, awayScore: 0 });
    if (res.status !== 200) {
      throw new Error(`Failed to save ${match.id}: ${res.status} ${JSON.stringify(res.body)}`);
    }
  }
}

export async function adminOverrideResult(
  app: Express,
  adminTok: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
  progressingTeamId?: string
): Promise<void> {
  const res = await request(app)
    .post('/api/admin/results/override')
    .set('Authorization', `Bearer ${adminTok}`)
    .send({
      matchId,
      homeScore,
      awayScore,
      progressingTeamId,
      status: 'FINISHED'
    });
  if (res.status !== 200) {
    throw new Error(`Override failed for ${matchId}: ${res.status} ${JSON.stringify(res.body)}`);
  }
}
