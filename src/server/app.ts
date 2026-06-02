import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { login, register, requireUser } from './services/auth';
import {
  commitDraft,
  getUserPredictionState,
  markReviewed,
  runAutoLocks,
  saveDraftPick,
  setBonusDraft,
  setGroupAccepted
} from './services/predictions';
import { computeLeaderboard } from './services/leaderboard';
import { getSyncStatus, syncFootballData } from './services/sync';
import { getMatchComparison, getNextMatchComparison, listUpcomingMatches } from './services/comparison';
import { getDb } from './database';

function authToken(req: express.Request): string | undefined {
  const bearer = req.header('authorization');
  if (bearer?.startsWith('Bearer ')) return bearer.replace('Bearer ', '');
  return undefined;
}

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        displayName: z.string().min(2)
      });
      const payload = schema.parse(req.body);
      const user = await register(payload.email, payload.password, payload.displayName);
      res.json({ user });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Bad request' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
      const payload = schema.parse(req.body);
      const response = await login(payload.email, payload.password);
      res.json(response);
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.get('/api/predictions/state', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      res.json(await getUserPredictionState(user.id));
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.post('/api/predictions/draft', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      const schema = z.object({
        matchId: z.string(),
        homeScore: z.number().int().min(0),
        awayScore: z.number().int().min(0),
        progressingTeamId: z.string().optional()
      });
      await saveDraftPick(user.id, schema.parse(req.body));
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid draft' });
    }
  });

  app.post('/api/predictions/review/:matchId', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      await markReviewed(user.id, String(req.params.matchId));
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Review failed' });
    }
  });

  app.post('/api/predictions/groups/:groupId/accept', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      const schema = z.object({ accepted: z.boolean() });
      const payload = schema.parse(req.body);
      await setGroupAccepted(user.id, String(req.params.groupId).toUpperCase(), payload.accepted);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Group accept failed' });
    }
  });

  app.post('/api/predictions/bonus', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      const schema = z.object({
        winnerTeamId: z.string(),
        runnerUpTeamId: z.string(),
        thirdTeamId: z.string(),
        fourthTeamId: z.string()
      });
      await setBonusDraft(user.id, schema.parse(req.body));
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid bonus picks' });
    }
  });

  app.post('/api/predictions/commit', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      await commitDraft(user.id, new Date().toISOString());
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Commit failed' });
    }
  });

  app.post('/api/system/locks/run', async (_req: Request, res: Response) => {
    await runAutoLocks(new Date().toISOString());
    res.json({ ok: true });
  });

  app.get('/api/comparison/fixtures', async (req: Request, res: Response) => {
    try {
      await requireUser(authToken(req));
      return res.json(await listUpcomingMatches(new Date().toISOString()));
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.get('/api/comparison/next', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      const data = await getNextMatchComparison(user.id, new Date().toISOString());
      if (!data) return res.status(404).json({ error: 'No upcoming matches' });
      return res.json(data);
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.get('/api/comparison/:matchId', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      const data = await getMatchComparison(String(req.params.matchId), user.id, new Date().toISOString());
      if (!data) return res.status(404).json({ error: 'Match not found' });
      return res.json(data);
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.get('/api/leaderboard', async (_req: Request, res: Response) => {
    res.json(await computeLeaderboard());
  });

  app.get('/api/admin/sync-status', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      if (!user.isAdmin) return res.status(403).json({ error: 'Admin only' });
      return res.json(await getSyncStatus());
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.post('/api/admin/sync/run', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      if (!user.isAdmin) return res.status(403).json({ error: 'Admin only' });
      const apiToken = process.env.FOOTBALL_DATA_TOKEN;
      if (!apiToken) return res.status(400).json({ error: 'FOOTBALL_DATA_TOKEN missing' });
      const result = await syncFootballData(apiToken);
      return res.json(result);
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.post('/api/admin/results/override', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      if (!user.isAdmin) return res.status(403).json({ error: 'Admin only' });
      const schema = z.object({
        matchId: z.string(),
        homeScore: z.number().int().min(0),
        awayScore: z.number().int().min(0),
        progressingTeamId: z.string().optional(),
        status: z.literal('FINISHED')
      });
      const payload = schema.parse(req.body);
      const db = getDb();
      await db.run(
        `INSERT INTO results (match_id, home_score, away_score, progressing_team_id, status, source, updated_at)
         VALUES (?, ?, ?, ?, ?, 'manual-override', ?)
         ON CONFLICT(match_id) DO UPDATE SET
           home_score=excluded.home_score,
           away_score=excluded.away_score,
           progressing_team_id=excluded.progressing_team_id,
           status=excluded.status,
           source=excluded.source,
           updated_at=excluded.updated_at`,
        [
          payload.matchId,
          payload.homeScore,
          payload.awayScore,
          payload.progressingTeamId ?? null,
          payload.status,
          new Date().toISOString()
        ]
      );
      return res.json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Override failed' });
    }
  });

  app.post('/api/admin/leaderboard/recompute', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      if (!user.isAdmin) return res.status(403).json({ error: 'Admin only' });
      return res.json({ ok: true, leaderboard: await computeLeaderboard() });
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  return app;
}
