import 'dotenv/config';
import { closeDatabase, getDb, initDatabase } from '../src/server/database/index.js';
import { runMigrations } from '../src/server/database/migrate.js';
import { ensureBootstrapAdmin } from '../src/server/services/auth.js';
import {
  formatBlockedActionMessage,
  hasStoredPredictions,
  migrationBlockedAlternatives,
  readProtectedRowCounts
} from '../src/lib/dataProtection.js';
import { writePredictionArchive } from '../src/lib/predictionArchive.js';

async function main() {
  await initDatabase({ skipMigrations: true });
  const db = getDb();
  const counts = await readProtectedRowCounts(db);

  if (hasStoredPredictions(counts)) {
    const manifest = writePredictionArchive({ counts, dialect: db.dialect });
    // eslint-disable-next-line no-console
    console.log(`Retrieval-only prediction archive written: ${manifest.archivePath}`);
  }

  try {
    await runMigrations(db);
    await ensureBootstrapAdmin();
    // eslint-disable-next-line no-console
    console.log(`Migrations applied (${db.dialect})`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('blocked by data protection')) {
      const message = formatBlockedActionMessage({
        action: 'Run database migrations',
        reasons: [`${counts.predictions} prediction row(s) are stored.`, error.message],
        alternatives: migrationBlockedAlternatives()
      });
      // eslint-disable-next-line no-console
      console.error(message);
    }
    throw error;
  }

  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
