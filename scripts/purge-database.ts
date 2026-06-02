import 'dotenv/config';
import { closeDatabase, getDb, initDatabase } from '../src/server/database/index.js';
import { resetDatabase } from '../src/server/database/migrate.js';

async function main() {
  await initDatabase();
  await resetDatabase(getDb());
  // eslint-disable-next-line no-console
  console.log(`Database purged and schema recreated (${getDb().dialect}).`);
  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
