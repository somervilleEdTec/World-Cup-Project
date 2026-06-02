import { fetchLatestResults, PROVIDER } from '../../services/footballDataService';
import { getMatches } from '../../lib/matchResolver';
import { db } from '../db';
import { resolveInternalMatchId, teamIdFromProviderName } from './matchMapping';

function progressingTeamId(
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  winnerHint?: string
): string | undefined {
  if (homeScore > awayScore) return homeTeamId;
  if (awayScore > homeScore) return awayTeamId;
  if (winnerHint === 'home') return homeTeamId;
  if (winnerHint === 'away') return awayTeamId;
  return undefined;
}

function fixtureTeamIds(internalId: string, homeName: string, awayName: string): { home: string; away: string } | null {
  const match = getMatches().find((m) => m.id === internalId);
  if (match && match.homeTeamId !== 'tbd' && match.awayTeamId !== 'tbd') {
    return { home: match.homeTeamId, away: match.awayTeamId };
  }
  const home = teamIdFromProviderName(homeName);
  const away = teamIdFromProviderName(awayName);
  if (!home || !away) return null;
  return { home, away };
}

export async function syncFootballData(apiToken: string) {
  const now = new Date().toISOString();
  db.prepare(`UPDATE sync_status SET last_attempt_at = ? WHERE id = 1`).run(now);

  try {
    const results = await fetchLatestResults(apiToken);
    let updated = 0;
    let skipped = 0;

    const tx = db.transaction(() => {
      results.forEach((result) => {
        const internalId = resolveInternalMatchId(PROVIDER, result.providerId, result.homeName, result.awayName);
        if (!internalId) {
          skipped += 1;
          return;
        }

        const teamsInFixture = fixtureTeamIds(internalId, result.homeName, result.awayName);
        if (!teamsInFixture) {
          skipped += 1;
          return;
        }

        const prog = progressingTeamId(
          teamsInFixture.home,
          teamsInFixture.away,
          result.homeScore,
          result.awayScore,
          result.progressingTeamId
        );

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
        ).run(internalId, result.homeScore, result.awayScore, prog ?? null, now);
        updated += 1;
      });
    });

    tx();
    db.prepare(`UPDATE sync_status SET last_success_at = ?, last_error = NULL WHERE id = 1`).run(now);
    return { ok: true, updated, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    db.prepare(`UPDATE sync_status SET last_error = ? WHERE id = 1`).run(message);
    return { ok: false, updated: 0, skipped: 0, error: message };
  }
}

export function getSyncStatus() {
  return db.prepare(`SELECT last_success_at, last_error, last_attempt_at FROM sync_status WHERE id = 1`).get() as {
    last_success_at: string | null;
    last_error: string | null;
    last_attempt_at: string | null;
  };
}
