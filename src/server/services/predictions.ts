import { getDb } from '../database';
import { getMatches } from '../../lib/matchResolver';
import { getResultsMap } from './leaderboard';
import { affectedFutureMatches, shouldLockGroup, validatePick } from '../../lib/tournamentLogic';
import { Pick, TournamentBonusPick } from '../../types';

async function getMeta(userId: string) {
  const db = getDb();
  return db.get<{
    commit_version: number;
    committed_at: string;
    group_locked: number;
    bonus_draft: string | null;
    bonus_committed: string | null;
    affected_matches: string;
  }>(
    `SELECT commit_version, committed_at, group_locked, bonus_draft, bonus_committed, affected_matches FROM prediction_meta WHERE user_id = ?`,
    [userId]
  );
}

export async function getUserPredictionState(userId: string) {
  const db = getDb();
  const rows = await db.all<{
    match_id: string;
    state: 'draft' | 'committed';
    home_score: number;
    away_score: number;
    progressing_team_id: string | null;
    reviewed: number;
  }>(`SELECT match_id, state, home_score, away_score, progressing_team_id, reviewed FROM predictions WHERE user_id = ?`, [
    userId
  ]);

  const committedPicks: Record<string, Pick> = {};
  const draftPicks: Record<string, Pick> = {};

  rows.forEach((row) => {
    const pick: Pick = {
      matchId: row.match_id,
      homeScore: row.home_score,
      awayScore: row.away_score,
      progressingTeamId: row.progressing_team_id ?? undefined,
      reviewed: row.reviewed === 1
    };
    if (row.state === 'committed') committedPicks[row.match_id] = pick;
    if (row.state === 'draft') draftPicks[row.match_id] = pick;
  });

  const meta = await getMeta(userId);
  return {
    committedPicks,
    draftPicks,
    affectedMatches: meta ? (JSON.parse(meta.affected_matches) as string[]) : [],
    commitState: {
      version: meta?.commit_version ?? 1,
      committedAt: meta?.committed_at ?? new Date().toISOString(),
      groupLocked: (meta?.group_locked ?? 0) === 1
    },
    bonusDraft: meta?.bonus_draft ? (JSON.parse(meta.bonus_draft) as TournamentBonusPick) : undefined,
    bonusCommitted: meta?.bonus_committed
      ? (JSON.parse(meta.bonus_committed) as TournamentBonusPick)
      : undefined
  };
}

export async function saveDraftPick(userId: string, pick: Pick) {
  const db = getDb();
  const state = await getUserPredictionState(userId);
  const results = await getResultsMap();
  const mergedPicks = { ...state.committedPicks, ...state.draftPicks, [pick.matchId]: pick };
  const match = getMatches(mergedPicks, results).find((m) => m.id === pick.matchId);
  if (!match) throw new Error('Match not found');
  const errors = validatePick(match, pick);
  if (errors.length) throw new Error(errors[0]);

  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO predictions (user_id, match_id, state, home_score, away_score, progressing_team_id, reviewed, updated_at)
     VALUES (?, ?, 'draft', ?, ?, ?, 1, ?)
     ON CONFLICT(user_id, match_id, state) DO UPDATE SET home_score=excluded.home_score, away_score=excluded.away_score, progressing_team_id=excluded.progressing_team_id, reviewed=1, updated_at=excluded.updated_at`,
    [userId, pick.matchId, pick.homeScore, pick.awayScore, pick.progressingTeamId ?? null, now]
  );

  const impacted = affectedFutureMatches(pick.matchId);
  for (const matchId of impacted) {
    await db.run(
      `UPDATE predictions SET reviewed = 0, updated_at = ? WHERE user_id = ? AND match_id = ? AND state = 'draft'`,
      [now, userId, matchId]
    );
  }

  const current = await getMeta(userId);
  const existing = current ? (JSON.parse(current.affected_matches) as string[]) : [];
  const affected = [...new Set([...existing, ...impacted])];
  await db.run(`UPDATE prediction_meta SET affected_matches = ? WHERE user_id = ?`, [
    JSON.stringify(affected),
    userId
  ]);
}

export async function setBonusDraft(userId: string, bonus: TournamentBonusPick) {
  const db = getDb();
  await db.run(`UPDATE prediction_meta SET bonus_draft = ? WHERE user_id = ?`, [JSON.stringify(bonus), userId]);
}

export async function markReviewed(userId: string, matchId: string) {
  const db = getDb();
  await db.run(`UPDATE predictions SET reviewed = 1 WHERE user_id = ? AND match_id = ? AND state = 'draft'`, [
    userId,
    matchId
  ]);
  const current = await getMeta(userId);
  const existing = current ? (JSON.parse(current.affected_matches) as string[]) : [];
  const updated = existing.filter((id) => id !== matchId);
  await db.run(`UPDATE prediction_meta SET affected_matches = ? WHERE user_id = ?`, [
    JSON.stringify(updated),
    userId
  ]);
}

export async function commitDraft(userId: string, nowIso: string) {
  const db = getDb();
  const state = await getUserPredictionState(userId);
  const hasUnreviewed = state.affectedMatches.some((matchId) => !state.draftPicks[matchId]?.reviewed);
  if (hasUnreviewed) throw new Error('Review affected fixtures and Commit changes.');

  const results = await getResultsMap();
  const merged = { ...state.committedPicks, ...state.draftPicks };
  for (const pick of Object.values(state.draftPicks)) {
    const match = getMatches(merged, results).find((m) => m.id === pick.matchId);
    if (!match) continue;
    const errors = validatePick(match, pick);
    if (errors.length) throw new Error(errors[0]);
  }

  await db.transaction(async (tx) => {
    for (const pick of Object.values(state.draftPicks)) {
      await tx.run(
        `INSERT INTO predictions (user_id, match_id, state, home_score, away_score, progressing_team_id, reviewed, updated_at)
         VALUES (?, ?, 'committed', ?, ?, ?, 1, ?)
         ON CONFLICT(user_id, match_id, state) DO UPDATE SET home_score=excluded.home_score, away_score=excluded.away_score, progressing_team_id=excluded.progressing_team_id, reviewed=1, updated_at=excluded.updated_at`,
        [userId, pick.matchId, pick.homeScore, pick.awayScore, pick.progressingTeamId ?? null, nowIso]
      );
    }

    await tx.run(`DELETE FROM predictions WHERE user_id = ? AND state = 'draft'`, [userId]);

    await tx.run(
      `UPDATE prediction_meta
       SET commit_version = commit_version + 1,
           committed_at = ?,
           affected_matches = '[]',
           bonus_committed = COALESCE(bonus_draft, bonus_committed),
           bonus_draft = NULL
       WHERE user_id = ?`,
      [nowIso, userId]
    );
  });
}

export async function runAutoLocks(nowIso: string) {
  const db = getDb();
  const lockGroup = shouldLockGroup(nowIso);
  const userRows = await db.all<{ user_id: string }>(`SELECT user_id FROM prediction_meta`);
  if (lockGroup) {
    for (const row of userRows) {
      await db.run(`UPDATE prediction_meta SET group_locked = 1 WHERE user_id = ?`, [row.user_id]);
    }
  }

  const results = await getResultsMap();
  const lockable = getMatches({}, results)
    .filter((m) => m.stage !== 'GROUP' && new Date(nowIso).getTime() >= new Date(m.kickoff).getTime())
    .map((m) => m.id);

  for (const matchId of lockable) {
    await db.run(`UPDATE predictions SET reviewed = 1 WHERE match_id = ? AND state = 'committed'`, [matchId]);
  }
}
