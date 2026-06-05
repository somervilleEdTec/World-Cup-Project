import { getDb } from '../database';
import { TournamentBonusPick, ActualResult } from '../../types';
import { computeScore } from '../../lib/tournamentLogic';
import { deriveFinalPlacings } from '../../lib/bracketEngine';
import { picksFromActuals } from '../../lib/pickUtils';
import {
  compareFinalTieBreak,
  isTournamentFinalComplete,
  resolveCoinFlipAmongTied,
  virtualCoinFlipOutcome,
  virtualCoinFlipPriority
} from '../../lib/tieBreakCoinFlip';
import { COMPETITION_USER_SQL, competitionUserBindParams } from './competitionUsers';

export async function getResultsMap(): Promise<Record<string, ActualResult>> {
  const db = getDb();
  const rows = await db.all<{
    match_id: string;
    home_score: number;
    away_score: number;
    progressing_team_id: string | null;
  }>(
    `SELECT match_id, home_score, away_score, progressing_team_id FROM results WHERE status = 'FINISHED'`
  );

  return Object.fromEntries(
    rows.map((row) => [
      row.match_id,
      {
        matchId: row.match_id,
        homeScore: row.home_score,
        awayScore: row.away_score,
        progressingTeamId: row.progressing_team_id ?? undefined
      }
    ])
  );
}

export async function computeLeaderboard() {
  const db = getDb();
  const users = await db.all<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM users WHERE ${COMPETITION_USER_SQL}`,
    competitionUserBindParams()
  );
  const results = await getResultsMap();
  const finalPlacings = deriveFinalPlacings(picksFromActuals(results), results);
  const finalComplete = isTournamentFinalComplete(results);

  const entries = await Promise.all(
    users.map(async (user) => {
      const committedRows = await db.all<{
        match_id: string;
        home_score: number;
        away_score: number;
        progressing_team_id: string | null;
        reviewed: number;
      }>(
        `SELECT match_id, home_score, away_score, progressing_team_id, reviewed
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
            progressingTeamId: row.progressing_team_id ?? undefined,
            reviewed: row.reviewed === 1
          }
        ])
      );

      const meta = await db.get<{ bonus_committed: string | null; committed_at: string }>(
        `SELECT bonus_committed, committed_at FROM prediction_meta WHERE user_id = ?`,
        [user.id]
      );
      const bonus = meta?.bonus_committed
        ? (JSON.parse(meta.bonus_committed) as TournamentBonusPick)
        : undefined;

      const summary = computeScore(picks, results, bonus, finalPlacings);
      return {
        userId: user.id,
        name: user.display_name,
        points: summary.points,
        correctResultPoints: summary.correctResultPoints,
        exactScorePoints: summary.exactScorePoints,
        groupPositionPoints: summary.groupPositionPoints,
        bonusPoints: summary.bonusPoints,
        tieBreak: {
          exactScores: summary.exactScores,
          correctResults: summary.correctResults,
          exactGroupPositions: summary.exactGroupPositions,
          bonusHits: summary.bonusHits
        }
      };
    })
  );

  const sorted = [...entries].sort(
    (a, b) =>
      b.points - a.points ||
      b.tieBreak.exactScores - a.tieBreak.exactScores ||
      b.tieBreak.correctResults - a.tieBreak.correctResults ||
      b.tieBreak.exactGroupPositions - a.tieBreak.exactGroupPositions ||
      b.tieBreak.bonusHits - a.tieBreak.bonusHits ||
      compareFinalTieBreak(a, b, finalComplete)
  );

  const coinFlipResolution = resolveCoinFlipAmongTied(sorted, finalComplete);
  const winnerId = coinFlipResolution?.winnerUserId;

  const ranked = sorted.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    name: entry.name,
    points: entry.points,
    correctResultPoints: entry.correctResultPoints,
    exactScorePoints: entry.exactScorePoints,
    groupPositionPoints: entry.groupPositionPoints,
    bonusPoints: entry.bonusPoints,
    coinFlip: finalComplete
      ? {
          outcome: virtualCoinFlipOutcome(entry.userId),
          priority: virtualCoinFlipPriority(entry.userId),
          wonTieBreak: winnerId === entry.userId && (coinFlipResolution?.userIds.length ?? 0) > 1
        }
      : undefined
  }));

  return {
    entries: ranked,
    meta: {
      tournamentFinalComplete: finalComplete,
      coinFlip: coinFlipResolution
        ? {
            applied: true,
            winnerUserId: coinFlipResolution.winnerUserId,
            winnerName: coinFlipResolution.winnerName,
            tiedUserIds: coinFlipResolution.userIds,
            outcomes: coinFlipResolution.outcomes
          }
        : { applied: false }
    }
  };
}
