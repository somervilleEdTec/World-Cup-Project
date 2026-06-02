import { getMatches } from '../../lib/matchResolver';
import { canViewOthersPicks, getNextUpcomingMatchId } from '../../lib/comparisonVisibility';
import { isGroupStage, kickoffReached, shouldLockGroup } from '../../lib/tournamentLogic';
import { getDb } from '../database';
import { getResultsMap } from './leaderboard';

export interface ComparisonPick {
  homeScore: number;
  awayScore: number;
  progressingTeamId?: string;
}

export interface ComparisonEntry {
  userId: string;
  displayName: string;
  isCurrentUser: boolean;
  pick: ComparisonPick | null;
  hidden: boolean;
}

export interface MatchComparisonResponse {
  actualResult: {
    homeScore: number;
    awayScore: number;
    progressingTeamId?: string;
  } | null;
  match: {
    id: string;
    stage: string;
    group?: string;
    kickoff: string;
    homeTeamId: string;
    awayTeamId: string;
  };
  visibility: {
    canViewOthers: boolean;
    groupLocked: boolean;
    matchLocked: boolean;
    message: string;
  };
  entries: ComparisonEntry[];
}

function rowToPick(row: {
  home_score: number | null;
  away_score: number | null;
  progressing_team_id: string | null;
}): ComparisonPick | null {
  if (row.home_score === null || row.away_score === null) return null;
  return {
    homeScore: row.home_score,
    awayScore: row.away_score,
    progressingTeamId: row.progressing_team_id ?? undefined
  };
}

async function isTournamentGroupPhaseLocked(db: ReturnType<typeof getDb>): Promise<boolean> {
  const row = await db.get<{ locked: number }>(
    `SELECT 1 AS locked FROM prediction_meta WHERE group_locked = 1 LIMIT 1`
  );
  return Boolean(row?.locked);
}

/** All fixtures with known teams (past and upcoming) for the comparison picker. */
export async function listComparisonFixtures() {
  const results = await getResultsMap();
  return getMatches({}, results)
    .filter((m) => m.homeTeamId !== 'tbd' && m.awayTeamId !== 'tbd')
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .map((m) => ({
      id: m.id,
      stage: m.stage,
      group: m.group,
      kickoff: m.kickoff,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId
    }));
}

export async function getMatchComparison(
  matchId: string,
  currentUserId: string,
  nowIso = new Date().toISOString()
): Promise<MatchComparisonResponse | null> {
  const db = getDb();
  const results = await getResultsMap();
  const match = getMatches({}, results).find((m) => m.id === matchId);
  if (!match) return null;

  const groupPhaseLocked = (await isTournamentGroupPhaseLocked(db)) || shouldLockGroup(nowIso);
  const canViewOthers = canViewOthersPicks(match, nowIso, groupPhaseLocked);
  const matchLocked = kickoffReached(match.kickoff, nowIso);
  const groupLocked = groupPhaseLocked;

  const users = await db.all<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM users ORDER BY display_name`
  );

  const pickRows = await db.all<{
    user_id: string;
    home_score: number;
    away_score: number;
    progressing_team_id: string | null;
  }>(
    `SELECT user_id, home_score, away_score, progressing_team_id
     FROM predictions
     WHERE match_id = ? AND state = 'committed'`,
    [matchId]
  );

  const pickByUser = new Map(pickRows.map((row) => [row.user_id, row]));

  const entries: ComparisonEntry[] = users.map((user) => {
    const isCurrentUser = user.id === currentUserId;
    const row = pickByUser.get(user.id);
    const pick = row ? rowToPick(row) : null;
    const hidden = !isCurrentUser && !canViewOthers;

    return {
      userId: user.id,
      displayName: user.display_name,
      isCurrentUser,
      pick: hidden ? null : pick,
      hidden
    };
  });

  const actual = results[match.id];
  const message = canViewOthers
    ? 'Showing committed picks for this fixture.'
    : isGroupStage(match)
      ? 'Other players’ picks appear after the first tournament kickoff (group lock).'
      : 'Other players’ committed knockout picks are shown once saved.';

  return {
    actualResult: actual
      ? {
          homeScore: actual.homeScore,
          awayScore: actual.awayScore,
          progressingTeamId: actual.progressingTeamId
        }
      : null,
    match: {
      id: match.id,
      stage: match.stage,
      group: match.group,
      kickoff: match.kickoff,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId
    },
    visibility: {
      canViewOthers,
      groupLocked,
      matchLocked,
      message
    },
    entries
  };
}

export async function getNextMatchComparison(currentUserId: string, nowIso = new Date().toISOString()) {
  const results = await getResultsMap();
  const allMatches = getMatches({}, results).filter(
    (m) => m.homeTeamId !== 'tbd' && m.awayTeamId !== 'tbd'
  );
  const nextId =
    getNextUpcomingMatchId(
      nowIso,
      allMatches.map((m) => ({ id: m.id, kickoff: m.kickoff }))
    ) ??
    allMatches
      .filter((m) => results[m.id] !== undefined)
      .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())[0]?.id ??
    allMatches.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())[0]?.id;
  if (!nextId) return null;
  return getMatchComparison(nextId, currentUserId, nowIso);
}
