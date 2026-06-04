import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import {
  changePassword,
  createPlayerAccount,
  listPlayers,
  login,
  requireAdmin,
  requireUser
} from './services/auth';
import {
  commitDraft,
  getUserPredictionState,
  markReviewed,
  runAutoLocks,
  saveDraftPick,
  setBonusDraft,
  setGroupAccepted,
  unlockGroupAccepted
} from './services/predictions';
import { computeLeaderboard } from './services/leaderboard';
import { buildMappingDiagnostics } from './services/mappingDiagnostics';
import {
  getSyncStatus,
  runFullFootballDataSync,
  syncKickoffsFromFootballData
} from './services/sync';
import {
  getMatchComparison,
  getNextMatchComparison,
  listComparisonFixtures
} from './services/comparison';
import { getDb } from './database';

function authToken(req: express.Request): string | undefined {
  const bearer = req.header('authorization');
  if (bearer?.startsWith('Bearer ')) return bearer.replace('Bearer ', '');
  return undefined;
}

function authFailureStatus(error: unknown): number {
  if (error instanceof Error) {
    if (error.message === 'PASSWORD_CHANGE_REQUIRED') return 403;
    if (error.message === 'Admin only') return 403;
    if (error.message === 'Unauthorized' || error.message === 'Missing auth token') return 401;
  }
  return 401;
}

function adminRouteFailureStatus(error: unknown): number {
  if (error instanceof Error) {
    if (error.message === 'Admin only' || error.message === 'PASSWORD_CHANGE_REQUIRED') return 403;
    if (error.message === 'Unauthorized' || error.message === 'Missing auth token') return 401;
  }
  return 400;
}

function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    const path = issue?.path?.join('.') ?? '';
    if (path.includes('homeScore') || path.includes('awayScore')) {
      return 'Scores must be whole numbers between 0 and 20.';
    }
    if (path.includes('password')) {
      return 'Password must be 1–6 characters.';
    }
    return fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        displayName: z.string().min(1),
        password: z.string().min(1).max(32)
      });
      const payload = schema.parse(req.body);
      const response = await login(payload.displayName, payload.password);
      res.json(response);
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req), { allowPasswordChange: true });
      return res.json({ user });
    } catch (error) {
      return res
        .status(authFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.post('/api/auth/change-password', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req), { allowPasswordChange: true });
      const schema = z.object({
        currentPassword: z.string().min(1).max(32),
        newPassword: z.string().min(1).max(6)
      });
      const payload = schema.parse(req.body);
      await changePassword(user.id, payload.currentPassword, payload.newPassword);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: apiErrorMessage(error, 'Password change failed') });
    }
  });

  app.get('/api/predictions/state', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      res.json(await getUserPredictionState(user.id));
    } catch (error) {
      res
        .status(authFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.post('/api/predictions/draft', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      const schema = z.object({
        matchId: z.string(),
        homeScore: z.number().int().min(0).max(20),
        awayScore: z.number().int().min(0).max(20),
        progressingTeamId: z.string().optional()
      });
      await saveDraftPick(user.id, schema.parse(req.body));
      res.json({ ok: true });
    } catch (error) {
      const status =
        error instanceof Error && error.message === 'PASSWORD_CHANGE_REQUIRED' ? 403 : 400;
      res.status(status).json({ error: apiErrorMessage(error, 'Invalid draft') });
    }
  });

  app.post('/api/predictions/review/:matchId', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      await markReviewed(user.id, String(req.params.matchId));
      res.json({ ok: true });
    } catch (error) {
      res
        .status(authFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Review failed' });
    }
  });

  app.post('/api/predictions/groups/:groupId/lock', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      await setGroupAccepted(user.id, String(req.params.groupId).toUpperCase(), true);
      res.json({ ok: true });
    } catch (error) {
      const status =
        error instanceof Error && error.message === 'PASSWORD_CHANGE_REQUIRED' ? 403 : 400;
      res.status(status).json({ error: error instanceof Error ? error.message : 'Group lock failed' });
    }
  });

  app.post('/api/predictions/groups/:groupId/unlock', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      await unlockGroupAccepted(user.id, String(req.params.groupId).toUpperCase());
      res.json({ ok: true });
    } catch (error) {
      const status =
        error instanceof Error && error.message === 'PASSWORD_CHANGE_REQUIRED' ? 403 : 400;
      res
        .status(status)
        .json({ error: error instanceof Error ? error.message : 'Group unlock failed' });
    }
  });

  app.post('/api/predictions/groups/:groupId/accept', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      const schema = z.object({ accepted: z.literal(true) });
      schema.parse(req.body);
      await setGroupAccepted(user.id, String(req.params.groupId).toUpperCase(), true);
      res.json({ ok: true });
    } catch (error) {
      const status =
        error instanceof Error && error.message === 'PASSWORD_CHANGE_REQUIRED' ? 403 : 400;
      res
        .status(status)
        .json({ error: error instanceof Error ? error.message : 'Group accept failed' });
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
      const status =
        error instanceof Error && error.message === 'PASSWORD_CHANGE_REQUIRED' ? 403 : 400;
      res
        .status(status)
        .json({ error: error instanceof Error ? error.message : 'Invalid bonus predictions' });
    }
  });

  app.post('/api/predictions/commit', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      await commitDraft(user.id, new Date().toISOString());
      res.json({ ok: true });
    } catch (error) {
      const status =
        error instanceof Error && error.message === 'PASSWORD_CHANGE_REQUIRED' ? 403 : 400;
      res.status(status).json({ error: error instanceof Error ? error.message : 'Commit failed' });
    }
  });

  app.post('/api/system/locks/run', async (req: Request, res: Response) => {
    try {
      await requireAdmin(authToken(req));
      await runAutoLocks(new Date().toISOString());
      return res.json({ ok: true });
    } catch (error) {
      return res
        .status(authFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.get('/api/comparison/fixtures', async (req: Request, res: Response) => {
    try {
      await requireUser(authToken(req));
      return res.json(await listComparisonFixtures());
    } catch (error) {
      return res
        .status(401)
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.get('/api/comparison/next', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      const data = await getNextMatchComparison(user.id, new Date().toISOString());
      if (!data) return res.status(404).json({ error: 'No upcoming matches' });
      return res.json(data);
    } catch (error) {
      return res
        .status(401)
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.get('/api/comparison/:matchId', async (req: Request, res: Response) => {
    try {
      const user = await requireUser(authToken(req));
      const data = await getMatchComparison(
        String(req.params.matchId),
        user.id,
        new Date().toISOString()
      );
      if (!data) return res.status(404).json({ error: 'Match not found' });
      return res.json(data);
    } catch (error) {
      return res
        .status(401)
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.get('/api/leaderboard', async (_req: Request, res: Response) => {
    res.json(await computeLeaderboard());
  });

  app.get('/api/admin/players', async (req: Request, res: Response) => {
    try {
      await requireAdmin(authToken(req));
      return res.json({ players: await listPlayers() });
    } catch (error) {
      return res
        .status(authFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.post('/api/admin/players', async (req: Request, res: Response) => {
    try {
      await requireAdmin(authToken(req));
      const schema = z.object({
        displayName: z.string().min(2),
        initialPassword: z.string().min(1).max(6)
      });
      const payload = schema.parse(req.body);
      const user = await createPlayerAccount(payload.displayName, payload.initialPassword);
      return res.json({ user });
    } catch (error) {
      return res
        .status(adminRouteFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Could not create player' });
    }
  });

  app.get('/api/admin/sync-status', async (req: Request, res: Response) => {
    try {
      await requireAdmin(authToken(req));
      return res.json(await getSyncStatus());
    } catch (error) {
      return res
        .status(authFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.post('/api/admin/sync/run', async (req: Request, res: Response) => {
    try {
      await requireAdmin(authToken(req));
      const apiToken = process.env.FOOTBALL_DATA_TOKEN;
      if (!apiToken) return res.status(400).json({ error: 'FOOTBALL_DATA_TOKEN missing' });
      const result = await runFullFootballDataSync(apiToken);
      return res.json(result);
    } catch (error) {
      return res
        .status(authFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.get('/api/admin/mapping-diagnostics', async (req: Request, res: Response) => {
    try {
      await requireAdmin(authToken(req));
      const apiToken = process.env.FOOTBALL_DATA_TOKEN;
      if (!apiToken) return res.status(400).json({ error: 'FOOTBALL_DATA_TOKEN missing' });
      return res.json(await buildMappingDiagnostics(apiToken));
    } catch (error) {
      return res
        .status(authFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Diagnostics failed' });
    }
  });

  app.post('/api/admin/fixtures/sync', async (req: Request, res: Response) => {
    try {
      await requireAdmin(authToken(req));
      const apiToken = process.env.FOOTBALL_DATA_TOKEN;
      if (!apiToken) return res.status(400).json({ error: 'FOOTBALL_DATA_TOKEN missing' });
      const result = await syncKickoffsFromFootballData(apiToken);
      return res.json(result);
    } catch (error) {
      return res
        .status(authFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  app.post('/api/admin/results/override', async (req: Request, res: Response) => {
    try {
      await requireAdmin(authToken(req));
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
      return res
        .status(adminRouteFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Override failed' });
    }
  });

  app.post('/api/admin/leaderboard/recompute', async (req: Request, res: Response) => {
    try {
      await requireAdmin(authToken(req));
      return res.json({ ok: true, leaderboard: await computeLeaderboard() });
    } catch (error) {
      return res
        .status(authFailureStatus(error))
        .json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  });

  return app;
}
