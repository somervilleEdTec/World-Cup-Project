import 'dotenv/config';
import { closeDatabase, initDatabase } from '../src/server/database/index.js';
import { seedGroupMatchMappings } from '../src/server/services/matchMapping.js';
import { syncKickoffsFromFootballData } from '../src/server/services/fixtureSync.js';
import { syncFootballData } from '../src/server/services/sync.js';

async function main() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    // eslint-disable-next-line no-console
    console.error('FOOTBALL_DATA_TOKEN is required');
    process.exit(1);
  }

  await initDatabase();
  await seedGroupMatchMappings();

  const kickoffs = await syncKickoffsFromFootballData(token);
  const results = await syncFootballData(token);

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete: ${kickoffs.mapped} kickoffs (${kickoffs.skipped} skipped), ${results.updated} results synced.`
  );
  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
