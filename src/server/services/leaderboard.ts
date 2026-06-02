import { getDb } from '../database';
import { TournamentBonusPick, ActualResult } from '../../types';
import { computeScore } from '../../lib/tournamentLogic';
import { deriveFinalPlacings } from '../../lib/bracketEngine';
import { picksFromActuals } from '../../lib/pickUtils';

export async function getResultsMap(): Promise<Record<string, ActualResult>> {
  const db = getDb();
  const rows = await db.all<{
    match_id: string;
    home_score: number;
    away_score: number;
    progressing_team_id: string | null;
  }>(`SELECT match_id, home_score, away_score, progressing_team_id FROM results WHERE status = 'FINISHED'`);

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
    `SELECT id, display_name FROM users`
  );
  const results = await getResultsMap();
  const finalPlacings = deriveFinalPlacings(picksFromActuals(results), results);

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

      const meta = await db.get<{ bonus_committed: string | null }>(
        `SELECT bonus_committed FROM prediction_meta WHERE user_id = ?`,
        [user.id]
      );
      const bonus = meta?.bonus_committed
        ? (JSON.parse(meta.bonus_committed) as TournamentBonusPick)
        : undefined;

      const summary = computeScore(picks, results, bonus, finalPlacings);
      return {
        userId: user.id,
        name: user.display_name,
        ...summary
      };
    })
  );

  return entries.sort(
    (a, b) =>
      b.points - a.points ||
      b.exactScores - a.exactScores ||
      b.correctResults - a.correctResults ||
      b.exactGroupPositions - a.exactGroupPositions ||
      b.bonusHits - a.bonusHits
  );
}
