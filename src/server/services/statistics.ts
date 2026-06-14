import { getMatches } from '../../lib/matchResolver';
import { canViewOthersPicks, isUpcomingFixture } from '../../lib/comparisonVisibility';
import {
  buildCrowdStatPool,
  collectViewablePicks,
  countUpcomingFixtures,
  sampleCrowdStats
} from '../../lib/crowdStatPool';
import { computeMatchConsensus } from '../../lib/predictionStats';
import { shouldLockGroup } from '../../lib/tournamentLogic';
import { TournamentBonusPick } from '../../types';
import { getDb } from '../database';
import { getResultsMap } from './leaderboard';
import { competitionUserBindParams, competitionUserWhere } from './competitionUsers';
import { UserPicks } from '../../lib/predictionStats';

async function isTournamentGroupPhaseLocked(db: ReturnType<typeof getDb>): Promise<boolean> {
  const row = await db.get<{ locked: number }>(
    `SELECT 1 AS locked FROM prediction_meta WHERE group_locked = 1 LIMIT 1`
  );
  return Boolean(row?.locked);
}

export async function computeStatistics(nowIso = new Date().toISOString()) {
  const db = getDb();
  const results = await getResultsMap();
  const matches = getMatches({}, results).filter(
    (m) => m.homeTeamId !== 'tbd' && m.awayTeamId !== 'tbd'
  );

  const dbGroupLocked = await isTournamentGroupPhaseLocked(db);
  const groupPhaseLocked = dbGroupLocked || shouldLockGroup(nowIso);

  const users = await db.all<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM users WHERE ${competitionUserWhere()} ORDER BY display_name`,
    competitionUserBindParams()
  );

  const userPicks: UserPicks[] = await Promise.all(
    users.map(async (user) => {
      const committedRows = await db.all<{
        match_id: string;
        home_score: number;
        away_score: number;
        progressing_team_id: string | null;
      }>(
        `SELECT match_id, home_score, away_score, progressing_team_id
         FROM predictions WHERE user_id = ? AND state = 'committed'`,
        [user.id]
      );

      const picks = Object.fromEntries(
        committedRows.map((row) => [
          row.match_id,
          {
            matchId: row.match_id,
            homeScore: row.home_score,
            awayScore: row.away_score,
            progressingTeamId: row.progressing_team_id ?? undefined
          }
        ])
      );

      const meta = await db.get<{ bonus_committed: string | null }>(
        `SELECT bonus_committed FROM prediction_meta WHERE user_id = ?`,
        [user.id]
      );
      const bonus = meta?.bonus_committed
        ? (JSON.parse(meta.bonus_committed) as TournamentBonusPick)
        : undefined;

      return {
        userId: user.id,
        displayName: user.display_name,
        picks,
        bonus
      };
    })
  );

  const viewableUpcomingMatchIds = new Set(
    matches
      .filter((match) => canViewOthersPicks(match, nowIso, groupPhaseLocked))
      .filter((match) => isUpcomingFixture(match, nowIso, results))
      .map((match) => match.id)
  );

  const matchConsensus = computeMatchConsensus(matches, userPicks, viewableUpcomingMatchIds);
  const allViewablePicks = collectViewablePicks(matches, userPicks, viewableUpcomingMatchIds);

  const pool = buildCrowdStatPool(
    {
      matches,
      userPicks,
      viewableUpcomingMatchIds,
      allViewablePicks,
      matchConsensus,
      groupPhaseLocked,
      results,
      includeBaldStat: Math.random() < 0.05
    },
    { revealNames: groupPhaseLocked }
  );

  const crowdCards = sampleCrowdStats(pool);

  const message = groupPhaseLocked
    ? 'Six upcoming-fixture crowd stats — shuffle for a fresh mix.'
    : 'Six teasers until first kickoff — team names hidden. Shuffle for more.';

  return {
    meta: {
      playerCount: users.length,
      upcomingFixtureCount: countUpcomingFixtures(matches, nowIso, results),
      groupPhaseLocked,
      message,
      cardCount: crowdCards.length
    },
    crowdCards
  };
}
