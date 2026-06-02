import { getDb } from './database';
import { runFullFootballDataSync } from './services/sync';

export async function warnIfNonLiveResultsPresent(): Promise<void> {
  const db = getDb();
  const row = await db.get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM results WHERE source NOT IN ('football-data.org', 'manual-override')`
  );
  const count = row?.count ?? 0;
  if (count > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[production] ${count} result(s) in the database are not from football-data.org. ` +
        'Run npm run db:purge for an empty production database, then sync live results.'
    );
  }
}

export async function bootstrapFootballData(apiToken: string): Promise<void> {
  const { kickoffs, results } = await runFullFootballDataSync(apiToken);
  // eslint-disable-next-line no-console
  console.log(
    `football-data.org: ${kickoffs.mapped}/${kickoffs.total} kickoffs, ${results.updated} finished match(es) synced`
  );
  if (!results.ok && results.error) {
    // eslint-disable-next-line no-console
    console.warn(`football-data.org results sync: ${results.error}`);
  }
}
