import { getMatches } from '../../lib/matchResolver';
import { canViewOthersPicks } from '../../lib/comparisonVisibility';
import { shouldLockGroup } from '../../lib/tournamentLogic';
import {
  computeFunFacts,
  computeGroupConsensus,
  computeHeadlines,
  computeMatchConsensus,
  computeMysteryStats,
  computeTournamentOutlook,
  MatchPickInput,
  sortMatchConsensusForDisplay,
  UserPicks
} from '../../lib/predictionStats';
import { TournamentBonusPick } from '../../types';
import { getDb } from '../database';
import { getResultsMap } from './leaderboard';
import { competitionUserBindParams, competitionUserWhere } from './competitionUsers';

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

  const viewableMatchIds = new Set(
    matches
      .filter((match) => canViewOthersPicks(match, nowIso, groupPhaseLocked))
      .map((match) => match.id)
  );

  const matchConsensus = computeMatchConsensus(matches, userPicks, viewableMatchIds);
  const { mostUnanimous, mostSplit } = sortMatchConsensusForDisplay(matchConsensus);
  const displayConsensus = [...mostUnanimous];
  for (const item of mostSplit) {
    if (!displayConsensus.some((d) => d.matchId === item.matchId)) {
      displayConsensus.push(item);
    }
  }

  const allViewablePicks: MatchPickInput[] = [];
  for (const match of matches) {
    if (!viewableMatchIds.has(match.id)) continue;
    for (const user of userPicks) {
      const pick = user.picks[match.id];
      if (!pick || pick.homeScore < 0 || pick.awayScore < 0) continue;
      allViewablePicks.push({
        matchId: match.id,
        stage: match.stage,
        group: match.group,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        pick,
        userId: user.userId,
        displayName: user.displayName
      });
    }
  }

  const headlines = computeHeadlines(matchConsensus, allViewablePicks);
  const groupConsensus = computeGroupConsensus(userPicks, groupPhaseLocked);
  const tournamentOutlook = computeTournamentOutlook(userPicks, groupPhaseLocked);
  const funFacts = computeFunFacts(
    matchConsensus,
    groupConsensus,
    userPicks,
    allViewablePicks,
    tournamentOutlook
  );

  const message = groupPhaseLocked
    ? 'Showing crowd prediction stats for unlocked fixtures.'
    : 'Detailed stats unlock after the first tournament kickoff. Knockout stats unlock 15 minutes before each fixture.';

  const mysteryStats = groupPhaseLocked
    ? []
    : computeMysteryStats(userPicks, { includeBaldStat: Math.random() < 0.25 });

  return {
    meta: {
      playerCount: users.length,
      viewableMatchCount: viewableMatchIds.size,
      groupPhaseLocked,
      message
    },
    headlines: groupPhaseLocked ? headlines : { hiveMind: null, roomForDebate: null, scorelineKing: null },
    matchConsensus: groupPhaseLocked ? displayConsensus : [],
    groupConsensus: groupPhaseLocked ? groupConsensus : [],
    tournamentOutlook: groupPhaseLocked
      ? tournamentOutlook
      : { visible: false, champion: [], runnerUp: [], third: [], fourth: [], darkHorse: null },
    funFacts: groupPhaseLocked ? funFacts : [],
    mysteryStats
  };
}
