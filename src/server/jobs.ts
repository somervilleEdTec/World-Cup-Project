import 'dotenv/config';
import { initDatabase } from './database';
import { runAutoLocks } from './services/predictions';
import { bootstrapFootballData } from './footballDataStartup';
import { syncFootballData, syncKickoffsFromFootballData } from './services/sync';
import { seedGroupMatchMappings } from './services/matchMapping';

const LOCK_INTERVAL_MS = 30 * 1000;
const RESULTS_SYNC_INTERVAL_MS = 2 * 60 * 1000;
const FIXTURE_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function main() {
  await initDatabase();
  await seedGroupMatchMappings();

  setInterval(() => {
    void runAutoLocks(new Date().toISOString());
  }, LOCK_INTERVAL_MS);

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (token) {
    try {
      await bootstrapFootballData(token);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Initial football-data sync failed:', error);
    }

    setInterval(() => {
      void syncFootballData(token);
    }, RESULTS_SYNC_INTERVAL_MS);

    setInterval(() => {
      void syncKickoffsFromFootballData(token);
    }, FIXTURE_SYNC_INTERVAL_MS);
  }

  // eslint-disable-next-line no-console
  console.log(
    token
      ? 'Scheduler started: locks 30s, results 2m, kickoffs 6h (football-data.org)'
      : 'Scheduler started: locks 30s (set FOOTBALL_DATA_TOKEN for live sync)'
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
