import 'dotenv/config';
import { closeDatabase, getDb, initDatabase } from '../src/server/database/index.js';
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
    const manifest = writePredictionArchive({
      counts,
      dialect: db.dialect
    });
    // eslint-disable-next-line no-console
    console.log(`Retrieval-only prediction archive written: ${manifest.archivePath}`);
  } else {
    // eslint-disable-next-line no-console
    console.log('No predictions stored — retrieval archive skipped.');
  }

  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
