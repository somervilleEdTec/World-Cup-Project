import 'dotenv/config';
import { closeDatabase, getDb, initDatabase } from '../src/server/database/index.js';

async function main() {
  await initDatabase();
  // eslint-disable-next-line no-console
  console.log(`Migrations applied (${getDb().dialect})`);
  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
