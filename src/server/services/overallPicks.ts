import { deriveFinalPlacings } from '../../lib/bracketEngine';
import { picksFromActuals } from '../../lib/pickUtils';
import { shouldLockGroup } from '../../lib/tournamentLogic';
import { TournamentBonusPick } from '../../types';
import { getDb } from '../database';
import { computeLeaderboard, getResultsMap } from './leaderboard';

async function isTournamentGroupPhaseLocked(db: ReturnType<typeof getDb>): Promise<boolean> {
  const row = await db.get<{ locked: number }>(
    `SELECT 1 AS locked FROM prediction_meta WHERE group_locked = 1 LIMIT 1`
  );
  return Boolean(row?.locked);
}

export async function computeOverallPicks(
  nowIso = new Date().toISOString(),
  currentUserId?: string
) {
  const db = getDb();
  const dbGroupLocked = await isTournamentGroupPhaseLocked(db);
  const groupPhaseLocked = dbGroupLocked || shouldLockGroup(nowIso);
  const leaderboard = await computeLeaderboard();
  const results = await getResultsMap();
  const finalPlacings = deriveFinalPlacings(picksFromActuals(results), results);

  const entries = await Promise.all(
    leaderboard.entries.map(async (entry) => {
      const meta = await db.get<{ bonus_committed: string | null }>(
        `SELECT bonus_committed FROM prediction_meta WHERE user_id = ?`,
        [entry.userId]
      );
      const bonus = meta?.bonus_committed
        ? (JSON.parse(meta.bonus_committed) as TournamentBonusPick)
        : undefined;
      const isCurrentUser = currentUserId === entry.userId;
      const hidden = !groupPhaseLocked && !isCurrentUser;

      return {
        rank: entry.rank,
        userId: entry.userId,
        name: entry.name,
        bonus: hidden ? undefined : bonus,
        hidden,
        isCurrentUser: isCurrentUser || undefined
      };
    })
  );

  const message = groupPhaseLocked
    ? "Everyone's tournament podium picks, ranked by league position."
    : 'Your picks are visible; everyone else stays hidden until first kickoff.';

  return {
    meta: {
      groupPhaseLocked,
      message,
      actualPlacings: groupPhaseLocked ? finalPlacings : undefined
    },
    entries
  };
}
