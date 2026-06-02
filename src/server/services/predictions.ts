import { matches } from '../../data/tournament';
import { db } from '../db';
import { affectedFutureMatches, shouldLockGroup, validatePick } from '../../lib/tournamentLogic';
import { Pick, TournamentBonusPick } from '../../types';

function getMeta(userId: string) {
  return db
    .prepare(`SELECT commit_version, committed_at, group_locked, bonus_draft, bonus_committed, affected_matches FROM prediction_meta WHERE user_id = ?`)
    .get(userId) as
    | {
        commit_version: number;
        committed_at: string;
        group_locked: number;
        bonus_draft: string | null;
        bonus_committed: string | null;
        affected_matches: string;
      }
    | undefined;
}

export function getUserPredictionState(userId: string) {
  const rows = db
    .prepare(`SELECT match_id, state, home_score, away_score, progressing_team_id, reviewed FROM predictions WHERE user_id = ?`)
    .all(userId) as Array<{
    match_id: string;
    state: 'draft' | 'committed';
    home_score: number;
    away_score: number;
    progressing_team_id: string | null;
    reviewed: number;
  }>;

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

  const meta = getMeta(userId);
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
    bonusCommitted: meta?.bonus_committed ? (JSON.parse(meta.bonus_committed) as TournamentBonusPick) : undefined
  };
}

export function saveDraftPick(userId: string, pick: Pick) {
  const match = matches.find((m) => m.id === pick.matchId);
  if (!match) throw new Error('Match not found');
  const errors = validatePick(match, pick);
  if (errors.length) throw new Error(errors[0]);

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO predictions (user_id, match_id, state, home_score, away_score, progressing_team_id, reviewed, updated_at)
     VALUES (?, ?, 'draft', ?, ?, ?, 1, ?)
     ON CONFLICT(user_id, match_id, state) DO UPDATE SET home_score=excluded.home_score, away_score=excluded.away_score, progressing_team_id=excluded.progressing_team_id, reviewed=1, updated_at=excluded.updated_at`
  ).run(userId, pick.matchId, pick.homeScore, pick.awayScore, pick.progressingTeamId ?? null, now);

  const impacted = affectedFutureMatches(pick.matchId);
  impacted.forEach((matchId) => {
    db.prepare(
      `UPDATE predictions SET reviewed = 0, updated_at = ? WHERE user_id = ? AND match_id = ? AND state = 'draft'`
    ).run(now, userId, matchId);
  });

  const current = getMeta(userId);
  const existing = current ? (JSON.parse(current.affected_matches) as string[]) : [];
  const affected = [...new Set([...existing, ...impacted])];
  db.prepare(`UPDATE prediction_meta SET affected_matches = ? WHERE user_id = ?`).run(JSON.stringify(affected), userId);
}

export function setBonusDraft(userId: string, bonus: TournamentBonusPick) {
  db.prepare(`UPDATE prediction_meta SET bonus_draft = ? WHERE user_id = ?`).run(JSON.stringify(bonus), userId);
}

export function markReviewed(userId: string, matchId: string) {
  db.prepare(`UPDATE predictions SET reviewed = 1 WHERE user_id = ? AND match_id = ? AND state = 'draft'`).run(userId, matchId);
  const current = getMeta(userId);
  const existing = current ? (JSON.parse(current.affected_matches) as string[]) : [];
  const updated = existing.filter((id) => id !== matchId);
  db.prepare(`UPDATE prediction_meta SET affected_matches = ? WHERE user_id = ?`).run(JSON.stringify(updated), userId);
}

export function commitDraft(userId: string, nowIso: string) {
  const state = getUserPredictionState(userId);
  const hasUnreviewed = state.affectedMatches.some((matchId) => !state.draftPicks[matchId]?.reviewed);
  if (hasUnreviewed) throw new Error('Review affected fixtures and Commit changes.');

  Object.values(state.draftPicks).forEach((pick) => {
    const match = matches.find((m) => m.id === pick.matchId);
    if (!match) return;
    const errors = validatePick(match, pick);
    if (errors.length) throw new Error(errors[0]);
  });

  const tx = db.transaction(() => {
    Object.values(state.draftPicks).forEach((pick) => {
      db.prepare(
        `INSERT INTO predictions (user_id, match_id, state, home_score, away_score, progressing_team_id, reviewed, updated_at)
         VALUES (?, ?, 'committed', ?, ?, ?, 1, ?)
         ON CONFLICT(user_id, match_id, state) DO UPDATE SET home_score=excluded.home_score, away_score=excluded.away_score, progressing_team_id=excluded.progressing_team_id, reviewed=1, updated_at=excluded.updated_at`
      ).run(userId, pick.matchId, pick.homeScore, pick.awayScore, pick.progressingTeamId ?? null, nowIso);
    });

    db.prepare(`DELETE FROM predictions WHERE user_id = ? AND state = 'draft'`).run(userId);

    db.prepare(
      `UPDATE prediction_meta
       SET commit_version = commit_version + 1,
           committed_at = ?,
           affected_matches = '[]',
           bonus_committed = COALESCE(bonus_draft, bonus_committed),
           bonus_draft = NULL
       WHERE user_id = ?`
    ).run(nowIso, userId);
  });

  tx();
}

export function runAutoLocks(nowIso: string) {
  const lockGroup = shouldLockGroup(nowIso);
  const userRows = db.prepare(`SELECT user_id FROM prediction_meta`).all() as Array<{ user_id: string }>;
  if (lockGroup) {
    userRows.forEach((row) => {
      db.prepare(`UPDATE prediction_meta SET group_locked = 1 WHERE user_id = ?`).run(row.user_id);
    });
  }

  const lockable = matches
    .filter((m) => m.stage !== 'GROUP' && new Date(nowIso).getTime() >= new Date(m.kickoff).getTime())
    .map((m) => m.id);

  lockable.forEach((matchId) => {
    db.prepare(
      `UPDATE predictions SET reviewed = 1 WHERE match_id = ? AND state = 'committed'`
    ).run(matchId);
  });
}
