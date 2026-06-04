import { getDb } from '../database';
import { groupMatches } from '../../data/tournament';
import { getMatches } from '../../lib/matchResolver';
import { validateBonusPick, validatePick } from '../../lib/tournamentLogic';
import {
  allGroupPicksCommitted,
  assertAllGroupPicksCommitted,
  assertBonusEditable,
  assertGroupUnlockAllowed,
  assertMatchEditable,
  countCommittedGroupPicks,
  GROUP_MATCH_COUNT,
  isGroupStage,
  isKnockout,
  isMatchEditable,
  predictionLockReached,
  shouldLockGroup
} from '../../lib/pickLocks';
import { Pick, TournamentBonusPick } from '../../types';
import {
  assertKnockoutFixtureConfirmed,
  buildConfirmedKnockoutFixtures
} from '../../lib/knockoutFixtureAvailability';
import { getResultsMap } from './leaderboard';

const VALID_GROUPS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);

async function getMeta(userId: string) {
  const db = getDb();
  return db.get<{
    commit_version: number;
    committed_at: string;
    group_locked: number;
    bonus_draft: string | null;
    bonus_committed: string | null;
    affected_matches: string;
    accepted_groups: string;
  }>(
    `SELECT commit_version, committed_at, group_locked, bonus_draft, bonus_committed, affected_matches, accepted_groups
     FROM prediction_meta WHERE user_id = ?`,
    [userId]
  );
}

function parseAcceptedGroups(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
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
  }>(
    `SELECT match_id, state, home_score, away_score, progressing_team_id, reviewed FROM predictions WHERE user_id = ?`,
    [userId]
  );

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
  const groupPicksCommittedCount = countCommittedGroupPicks(committedPicks);
  const results = await getResultsMap();
  const confirmedIds = new Set(buildConfirmedKnockoutFixtures(results).map((m) => m.id));
  const confirmedKnockoutFixtures = getMatches({}, results).filter((m) => confirmedIds.has(m.id));
  return {
    committedPicks,
    draftPicks,
    affectedMatches: meta ? (JSON.parse(meta.affected_matches) as string[]) : [],
    acceptedGroups: parseAcceptedGroups(meta?.accepted_groups),
    groupPicksCommittedCount,
    groupPicksRequired: GROUP_MATCH_COUNT,
    allGroupPicksCommitted: allGroupPicksCommitted(committedPicks),
    confirmedKnockoutFixtures,
    officialResults: results,
    commitState: {
      version: meta?.commit_version ?? 1,
      committedAt: meta?.committed_at ?? new Date().toISOString(),
      groupLocked: (meta?.group_locked ?? 0) === 1
    },
    bonusDraft: meta?.bonus_draft
      ? (JSON.parse(meta.bonus_draft) as TournamentBonusPick)
      : undefined,
    bonusCommitted: meta?.bonus_committed
      ? (JSON.parse(meta.bonus_committed) as TournamentBonusPick)
      : undefined
  };
}

export async function saveDraftPick(userId: string, pick: Pick, nowIso = new Date().toISOString()) {
  const db = getDb();
  const meta = await getMeta(userId);
  const groupLocked = (meta?.group_locked ?? 0) === 1;

  const state = await getUserPredictionState(userId);
  const results = await getResultsMap();
  const mergedPicks = { ...state.committedPicks, ...state.draftPicks, [pick.matchId]: pick };
  const match = getMatches(mergedPicks, results).find((m) => m.id === pick.matchId);
  if (!match) throw new Error('Match not found');

  assertMatchEditable(match, groupLocked, nowIso, results[pick.matchId]);

  if (isGroupStage(match) && match.group) {
    const lockedGroups = parseAcceptedGroups(meta?.accepted_groups);
    if (lockedGroups.includes(match.group)) {
      throw new Error(`Group ${match.group} is locked.`);
    }
  }

  if (isKnockout(match)) {
    assertAllGroupPicksCommitted(state.committedPicks, groupLocked, nowIso);
    assertKnockoutFixtureConfirmed(pick.matchId, results);
  }

  const errors = validatePick(match, pick);
  if (errors.length) throw new Error(errors[0]);

  const now = nowIso;
  await db.run(
    `INSERT INTO predictions (user_id, match_id, state, home_score, away_score, progressing_team_id, reviewed, updated_at)
     VALUES (?, ?, 'committed', ?, ?, ?, 1, ?)
     ON CONFLICT(user_id, match_id, state) DO UPDATE SET home_score=excluded.home_score, away_score=excluded.away_score, progressing_team_id=excluded.progressing_team_id, reviewed=1, updated_at=excluded.updated_at`,
    [userId, pick.matchId, pick.homeScore, pick.awayScore, pick.progressingTeamId ?? null, now]
  );
  await db.run(`DELETE FROM predictions WHERE user_id = ? AND match_id = ? AND state = 'draft'`, [
    userId,
    pick.matchId
  ]);
}

export async function setBonusDraft(
  userId: string,
  bonus: TournamentBonusPick,
  nowIso = new Date().toISOString()
) {
  const db = getDb();
  const meta = await getMeta(userId);
  const groupLocked = (meta?.group_locked ?? 0) === 1;
  assertBonusEditable(groupLocked, nowIso);

  const bonusErrors = validateBonusPick(bonus);
  if (bonusErrors.length) throw new Error(bonusErrors[0]);

  await db.run(
    `UPDATE prediction_meta SET bonus_committed = ?, bonus_draft = NULL, committed_at = ? WHERE user_id = ?`,
    [JSON.stringify(bonus), nowIso, userId]
  );
}

export async function setGroupAccepted(
  userId: string,
  groupId: string,
  accepted: boolean,
  nowIso = new Date().toISOString()
) {
  if (!VALID_GROUPS.has(groupId)) throw new Error('Invalid group');
  if (!accepted) {
    throw new Error('Use unlockGroup to remove a per-group lock.');
  }

  if (shouldLockGroup(nowIso)) {
    throw new Error('Group-stage predictions are locked.');
  }

  const meta = await getMeta(userId);
  const lockedGroups = parseAcceptedGroups(meta?.accepted_groups);
  if (lockedGroups.includes(groupId)) {
    throw new Error(`Group ${groupId} is already locked.`);
  }

  const state = await getUserPredictionState(userId);
  const mergedPicks = { ...state.committedPicks, ...state.draftPicks };
  const groupMatchIds = groupMatches.filter((m) => m.group === groupId);

  const complete = groupMatchIds.every((m) => mergedPicks[m.id] !== undefined);
  if (!complete) throw new Error(`Complete all matches in Group ${groupId} before locking.`);

  const results = await getResultsMap();
  const db = getDb();

  await db.transaction(async (tx) => {
    for (const match of groupMatchIds) {
      const pick = mergedPicks[match.id];
      if (!pick) continue;

      const matchObj = getMatches(mergedPicks, results).find((m) => m.id === match.id);
      if (!matchObj) continue;
      const errors = validatePick(matchObj, pick);
      if (errors.length) throw new Error(errors[0]);

      await tx.run(
        `INSERT INTO predictions (user_id, match_id, state, home_score, away_score, progressing_team_id, reviewed, updated_at)
         VALUES (?, ?, 'committed', ?, ?, ?, 1, ?)
         ON CONFLICT(user_id, match_id, state) DO UPDATE SET home_score=excluded.home_score, away_score=excluded.away_score, progressing_team_id=excluded.progressing_team_id, reviewed=1, updated_at=excluded.updated_at`,
        [
          userId,
          pick.matchId,
          pick.homeScore,
          pick.awayScore,
          pick.progressingTeamId ?? null,
          nowIso
        ]
      );
      await tx.run(
        `DELETE FROM predictions WHERE user_id = ? AND match_id = ? AND state = 'draft'`,
        [userId, pick.matchId]
      );
    }

    const next = [...new Set([...lockedGroups, groupId])];
    await tx.run(
      `UPDATE prediction_meta SET accepted_groups = ?, affected_matches = '[]' WHERE user_id = ?`,
      [JSON.stringify(next), userId]
    );
  });
}

export async function unlockGroupAccepted(
  userId: string,
  groupId: string,
  nowIso = new Date().toISOString()
): Promise<void> {
  if (!VALID_GROUPS.has(groupId)) throw new Error('Invalid group');

  if (shouldLockGroup(nowIso)) {
    throw new Error('Group-stage predictions are locked.');
  }

  const results = await getResultsMap();
  assertGroupUnlockAllowed(groupId, results);

  const meta = await getMeta(userId);
  const lockedGroups = parseAcceptedGroups(meta?.accepted_groups);
  if (!lockedGroups.includes(groupId)) {
    throw new Error(`Group ${groupId} is not locked.`);
  }

  const next = lockedGroups.filter((id) => id !== groupId);
  const db = getDb();
  await db.run(`UPDATE prediction_meta SET accepted_groups = ? WHERE user_id = ?`, [
    JSON.stringify(next),
    userId
  ]);
}

export async function markReviewed(userId: string, matchId: string) {
  const db = getDb();
  await db.run(
    `UPDATE predictions SET reviewed = 1 WHERE user_id = ? AND match_id = ? AND state = 'draft'`,
    [userId, matchId]
  );
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
  const meta = await getMeta(userId);
  const groupLocked = (meta?.group_locked ?? 0) === 1;
  const state = await getUserPredictionState(userId);
  const results = await getResultsMap();
  const merged = { ...state.committedPicks, ...state.draftPicks };

  const promotableDrafts = Object.values(state.draftPicks).filter((pick) => {
    const match = getMatches(merged, results).find((m) => m.id === pick.matchId);
    return match && isMatchEditable(match, groupLocked, nowIso, results[pick.matchId]);
  });

  const hasUnreviewed = promotableDrafts.some(
    (pick) => state.affectedMatches.includes(pick.matchId) && !pick.reviewed
  );
  if (hasUnreviewed) throw new Error('Review affected fixtures and Commit changes.');

  for (const pick of promotableDrafts) {
    const match = getMatches(merged, results).find((m) => m.id === pick.matchId);
    if (!match) continue;
    const errors = validatePick(match, pick);
    if (errors.length) throw new Error(errors[0]);
  }

  if (promotableDrafts.length === 0 && Object.keys(state.draftPicks).length > 0) {
    throw new Error('No editable draft picks to commit (fixtures may be locked).');
  }

  await db.transaction(async (tx) => {
    for (const pick of promotableDrafts) {
      await tx.run(
        `INSERT INTO predictions (user_id, match_id, state, home_score, away_score, progressing_team_id, reviewed, updated_at)
         VALUES (?, ?, 'committed', ?, ?, ?, 1, ?)
         ON CONFLICT(user_id, match_id, state) DO UPDATE SET home_score=excluded.home_score, away_score=excluded.away_score, progressing_team_id=excluded.progressing_team_id, reviewed=1, updated_at=excluded.updated_at`,
        [
          userId,
          pick.matchId,
          pick.homeScore,
          pick.awayScore,
          pick.progressingTeamId ?? null,
          nowIso
        ]
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
    .filter((m) => m.stage !== 'GROUP' && predictionLockReached(m.kickoff, nowIso))
    .map((m) => m.id);

  for (const matchId of lockable) {
    await db.run(`UPDATE predictions SET reviewed = 1 WHERE match_id = ? AND state = 'committed'`, [
      matchId
    ]);
  }
}
