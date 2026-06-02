import { fetchLatestResults } from '../../services/footballDataService';
import { db } from '../db';

export async function syncFootballData(apiToken: string) {
  const now = new Date().toISOString();
  db.prepare(`UPDATE sync_status SET last_attempt_at = ? WHERE id = 1`).run(now);

  try {
    const results = await fetchLatestResults(apiToken);
    const tx = db.transaction(() => {
      results.forEach((result) => {
        db.prepare(
          `INSERT INTO results (match_id, home_score, away_score, progressing_team_id, status, source, updated_at)
           VALUES (?, ?, ?, ?, 'FINISHED', 'football-data.org', ?)
           ON CONFLICT(match_id) DO UPDATE SET
             home_score=excluded.home_score,
             away_score=excluded.away_score,
             progressing_team_id=excluded.progressing_team_id,
             status=excluded.status,
             source=excluded.source,
             updated_at=excluded.updated_at`
        ).run(result.matchId, result.homeScore, result.awayScore, result.progressingTeamId ?? null, now);
      });
    });

    tx();
    db.prepare(`UPDATE sync_status SET last_success_at = ?, last_error = NULL WHERE id = 1`).run(now);
    return { ok: true, updated: results.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    db.prepare(`UPDATE sync_status SET last_error = ? WHERE id = 1`).run(message);
    return { ok: false, updated: 0, error: message };
  }
}

export function getSyncStatus() {
  return db.prepare(`SELECT last_success_at, last_error, last_attempt_at FROM sync_status WHERE id = 1`).get() as {
    last_success_at: string | null;
    last_error: string | null;
    last_attempt_at: string | null;
  };
}
