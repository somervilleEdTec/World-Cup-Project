import { db } from '../db';
import { TournamentBonusPick, ActualResult } from '../../types';
import { computeScore } from '../../lib/tournamentLogic';
import { deriveFinalPlacings } from '../../lib/bracketEngine';
import { picksFromActuals } from '../../lib/pickUtils';

export function getResultsMap(): Record<string, ActualResult> {
  const rows = db
    .prepare(`SELECT match_id, home_score, away_score, progressing_team_id FROM results WHERE status = 'FINISHED'`)
    .all() as Array<{ match_id: string; home_score: number; away_score: number; progressing_team_id: string | null }>;

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

export function computeLeaderboard() {
  const users = db.prepare(`SELECT id, display_name FROM users`).all() as Array<{ id: string; display_name: string }>;
  const results = getResultsMap();
  const finalPlacings = deriveFinalPlacings(picksFromActuals(results), results);

  return users
    .map((user) => {
      const committedRows = db
        .prepare(
          `SELECT match_id, home_score, away_score, progressing_team_id, reviewed
           FROM predictions WHERE user_id = ? AND state = 'committed'`
        )
        .all(user.id) as Array<{
        match_id: string;
        home_score: number;
        away_score: number;
        progressing_team_id: string | null;
        reviewed: number;
      }>;

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

      const meta = db
        .prepare(`SELECT bonus_committed FROM prediction_meta WHERE user_id = ?`)
        .get(user.id) as { bonus_committed: string | null };
      const bonus = meta?.bonus_committed ? (JSON.parse(meta.bonus_committed) as TournamentBonusPick) : undefined;

      const summary = computeScore(picks, results, bonus, finalPlacings);
      return {
        userId: user.id,
        name: user.display_name,
        ...summary
      };
    })
    .sort((a, b) =>
      b.points - a.points ||
      b.exactScores - a.exactScores ||
      b.correctResults - a.correctResults ||
      b.exactGroupPositions - a.exactGroupPositions ||
      b.bonusHits - a.bonusHits
    );
}
