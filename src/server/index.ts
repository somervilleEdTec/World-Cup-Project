import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { login, register, requireUser } from './services/auth';
import {
  commitDraft,
  getUserPredictionState,
  markReviewed,
  runAutoLocks,
  saveDraftPick,
  setBonusDraft
} from './services/predictions';
import { computeLeaderboard } from './services/leaderboard';
import { getSyncStatus, syncFootballData } from './services/sync';
import { db } from './db';

const app = express();
app.use(cors());
app.use(express.json());

function authToken(req: express.Request): string | undefined {
  const bearer = req.header('authorization');
  if (bearer?.startsWith('Bearer ')) return bearer.replace('Bearer ', '');
  return undefined;
}

app.post('/api/auth/register', (req, res) => {
  try {
    const schema = z.object({ email: z.string().email(), password: z.string().min(8), displayName: z.string().min(2) });
    const payload = schema.parse(req.body);
    const user = register(payload.email, payload.password, payload.displayName);
    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Bad request' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
    const payload = schema.parse(req.body);
    const response = login(payload.email, payload.password);
    res.json(response);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
  }
});

app.get('/api/predictions/state', (req, res) => {
  try {
    const user = requireUser(authToken(req));
    res.json(getUserPredictionState(user.id));
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
  }
});

app.post('/api/predictions/draft', (req, res) => {
  try {
    const user = requireUser(authToken(req));
    const schema = z.object({
      matchId: z.string(),
      homeScore: z.number().int().min(0),
      awayScore: z.number().int().min(0),
      progressingTeamId: z.string().optional()
    });
    saveDraftPick(user.id, schema.parse(req.body));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid draft' });
  }
});

app.post('/api/predictions/review/:matchId', (req, res) => {
  try {
    const user = requireUser(authToken(req));
    markReviewed(user.id, req.params.matchId);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Review failed' });
  }
});

app.post('/api/predictions/bonus', (req, res) => {
  try {
    const user = requireUser(authToken(req));
    const schema = z.object({
      winnerTeamId: z.string(),
      runnerUpTeamId: z.string(),
      thirdTeamId: z.string(),
      fourthTeamId: z.string()
    });
    setBonusDraft(user.id, schema.parse(req.body));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid bonus picks' });
  }
});

app.post('/api/predictions/commit', (req, res) => {
  try {
    const user = requireUser(authToken(req));
    commitDraft(user.id, new Date().toISOString());
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Commit failed' });
  }
});

app.post('/api/system/locks/run', (_req, res) => {
  runAutoLocks(new Date().toISOString());
  res.json({ ok: true });
});

app.get('/api/leaderboard', (_req, res) => {
  res.json(computeLeaderboard());
});

app.get('/api/admin/sync-status', (req, res) => {
  try {
    const user = requireUser(authToken(req));
    if (!user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    return res.json(getSyncStatus());
  } catch (error) {
    return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
  }
});

app.post('/api/admin/sync/run', async (req, res) => {
  try {
    const user = requireUser(authToken(req));
    if (!user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    const apiToken = process.env.FOOTBALL_DATA_TOKEN;
    if (!apiToken) return res.status(400).json({ error: 'FOOTBALL_DATA_TOKEN missing' });
    const result = await syncFootballData(apiToken);
    return res.json(result);
  } catch (error) {
    return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
  }
});

app.post('/api/admin/results/override', (req, res) => {
  try {
    const user = requireUser(authToken(req));
    if (!user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    const schema = z.object({
      matchId: z.string(),
      homeScore: z.number().int().min(0),
      awayScore: z.number().int().min(0),
      progressingTeamId: z.string().optional(),
      status: z.literal('FINISHED')
    });
    const payload = schema.parse(req.body);
    db.prepare(
      `INSERT INTO results (match_id, home_score, away_score, progressing_team_id, status, source, updated_at)
       VALUES (?, ?, ?, ?, ?, 'manual-override', ?)
       ON CONFLICT(match_id) DO UPDATE SET
         home_score=excluded.home_score,
         away_score=excluded.away_score,
         progressing_team_id=excluded.progressing_team_id,
         status=excluded.status,
         source=excluded.source,
         updated_at=excluded.updated_at`
    ).run(payload.matchId, payload.homeScore, payload.awayScore, payload.progressingTeamId ?? null, payload.status, new Date().toISOString());
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Override failed' });
  }
});

app.post('/api/admin/leaderboard/recompute', (req, res) => {
  try {
    const user = requireUser(authToken(req));
    if (!user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    return res.json({ ok: true, leaderboard: computeLeaderboard() });
  } catch (error) {
    return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
  }
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on :${port}`);
});
