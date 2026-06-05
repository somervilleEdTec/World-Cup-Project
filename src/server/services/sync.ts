import { fetchLatestResults, PROVIDER } from '../../services/footballDataService';
import { getMatches } from '../../lib/matchResolver';
import { ActualResult } from '../../types';
import { getDb } from '../database';
import { resolveInternalMatchId, teamIdFromProviderName } from './matchMapping';
import { getResultsMap } from './leaderboard';
import { syncKickoffsFromFootballData } from './fixtureSync';

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

function fixtureTeamIds(
  internalId: string,
  homeName: string | null | undefined,
  awayName: string | null | undefined,
  actuals: Record<string, ActualResult> = {}
): { home: string; away: string } | null {
  const match = getMatches({}, actuals).find((m) => m.id === internalId);
  if (match && match.homeTeamId !== 'tbd' && match.awayTeamId !== 'tbd') {
    return { home: match.homeTeamId, away: match.awayTeamId };
  }
  const home = teamIdFromProviderName(homeName);
  const away = teamIdFromProviderName(awayName);
  if (!home || !away) return null;
  return { home, away };
}

export async function syncFootballData(apiToken: string) {
  const db = getDb();
  const now = new Date().toISOString();
  await db.run(`UPDATE sync_status SET last_attempt_at = ? WHERE id = 1`, [now]);

  try {
    const apiResults = await fetchLatestResults(apiToken);
    const storedActuals = await getResultsMap();
    const syncActuals: Record<string, ActualResult> = { ...storedActuals };
    let updated = 0;
    let skipped = 0;

    await db.transaction(async (tx) => {
      for (const result of apiResults) {
        const internalId = await resolveInternalMatchId(
          PROVIDER,
          result.providerId,
          result.homeName,
          result.awayName,
          syncActuals
        );
        if (!internalId) {
          skipped += 1;
          continue;
        }

        const teamsInFixture = fixtureTeamIds(
          internalId,
          result.homeName,
          result.awayName,
          syncActuals
        );
        if (!teamsInFixture) {
          skipped += 1;
          continue;
        }

        const prog = progressingTeamId(
          teamsInFixture.home,
          teamsInFixture.away,
          result.homeScore,
          result.awayScore,
          result.progressingTeamId
        );

        const actual: ActualResult = {
          matchId: internalId,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          progressingTeamId: prog
        };

        await tx.run(
          `INSERT INTO results (match_id, home_score, away_score, progressing_team_id, status, source, updated_at)
           VALUES (?, ?, ?, ?, 'FINISHED', 'football-data.org', ?)
           ON CONFLICT(match_id) DO UPDATE SET
             home_score=excluded.home_score,
             away_score=excluded.away_score,
             progressing_team_id=excluded.progressing_team_id,
             status=excluded.status,
             source=excluded.source,
             updated_at=excluded.updated_at`,
          [internalId, result.homeScore, result.awayScore, prog ?? null, now]
        );
        syncActuals[internalId] = actual;
        updated += 1;
      }
    });

    await db.run(`UPDATE sync_status SET last_success_at = ?, last_error = NULL WHERE id = 1`, [
      now
    ]);
    return { ok: true, updated, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    await db.run(`UPDATE sync_status SET last_error = ? WHERE id = 1`, [message]);
    return { ok: false, updated: 0, skipped: 0, error: message };
  }
}

export async function runFullFootballDataSync(apiToken: string) {
  const storedActuals = await getResultsMap();
  const kickoffs = await syncKickoffsFromFootballData(apiToken, storedActuals);
  const results = await syncFootballData(apiToken);
  return { kickoffs, results };
}

export { syncKickoffsFromFootballData } from './fixtureSync';

export async function getSyncStatus() {
  const db = getDb();
  return db.get<{
    last_success_at: string | null;
    last_error: string | null;
    last_attempt_at: string | null;
  }>(`SELECT last_success_at, last_error, last_attempt_at FROM sync_status WHERE id = 1`);
}
