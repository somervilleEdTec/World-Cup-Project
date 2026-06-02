import 'dotenv/config';
import { initDatabase } from './database';
import { runAutoLocks } from './services/predictions';
import { syncFootballData } from './services/sync';
import { seedGroupMatchMappings } from './services/matchMapping';

const LOCK_INTERVAL_MS = 30 * 1000;
const SYNC_INTERVAL_MS = 2 * 60 * 1000;

async function main() {
  await initDatabase();
  await seedGroupMatchMappings();

  setInterval(() => {
    void runAutoLocks(new Date().toISOString());
  }, LOCK_INTERVAL_MS);

  setInterval(() => {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) return;
    void syncFootballData(token);
  }, SYNC_INTERVAL_MS);

  // eslint-disable-next-line no-console
  console.log('Scheduler started: locks every 30s, sync every 2m');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
