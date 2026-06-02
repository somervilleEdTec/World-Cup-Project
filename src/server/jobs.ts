import { runAutoLocks } from './services/predictions';
import { syncFootballData } from './services/sync';

const LOCK_INTERVAL_MS = 30 * 1000;
const SYNC_INTERVAL_MS = 2 * 60 * 1000;

async function run() {
  setInterval(() => {
    runAutoLocks(new Date().toISOString());
  }, LOCK_INTERVAL_MS);

  setInterval(async () => {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) return;
    await syncFootballData(token);
  }, SYNC_INTERVAL_MS);

  // eslint-disable-next-line no-console
  console.log('Scheduler started: locks every 30s, sync every 2m');
}

run();
