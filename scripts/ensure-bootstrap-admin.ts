import 'dotenv/config';
import { closeDatabase, initDatabase } from '../src/server/database/index.js';
import { ensureBootstrapAdmin, BOOTSTRAP_ADMIN_USERNAME } from '../src/server/services/auth.js';

async function main(): Promise<void> {
  await initDatabase();
  await ensureBootstrapAdmin();
  // eslint-disable-next-line no-console
  console.log(`Bootstrap admin ensured: ${BOOTSTRAP_ADMIN_USERNAME}`);
  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
