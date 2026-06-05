import 'dotenv/config';
import { closeDatabase, getDb, initDatabase } from '../src/server/database/index.js';
import { resetDatabase } from '../src/server/database/migrate.js';
import { ensureBootstrapAdmin } from '../src/server/services/auth.js';
import {
  formatBlockedActionMessage,
  hasStoredPredictions,
  purgeBlockedAlternatives,
  readProtectedRowCounts
} from '../src/lib/dataProtection.js';
import { writePredictionArchive } from '../src/lib/predictionArchive.js';

const confirmLive =
  process.env.CONFIRM_LIVE_DB_PURGE === 'yes' || process.argv.includes('--confirm-live');
const confirmDestroyPredictions =
  process.env.CONFIRM_DESTROY_PREDICTIONS === 'yes' ||
  process.argv.includes('--confirm-destroy-predictions');

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !confirmLive) {
    const message = formatBlockedActionMessage({
      action: 'Purge production database',
      reasons: ['Production purge requires explicit confirmation.'],
      alternatives: purgeBlockedAlternatives()
    });
    // eslint-disable-next-line no-console
    console.error(message);
    // eslint-disable-next-line no-console
    console.error(
      'To confirm (only when intentionally wiping before launch):\n' +
        '  CONFIRM_LIVE_DB_PURGE=yes CONFIRM_DESTROY_PREDICTIONS=yes npm run db:purge:live'
    );
    process.exit(1);
  }

  await initDatabase({ skipMigrations: true });
  const db = getDb();
  const counts = await readProtectedRowCounts(db);
  const dialect = db.dialect;
  const sqlitePath = process.env.SQLITE_PATH ?? 'data.db';

  if (hasStoredPredictions(counts)) {
    if (!confirmDestroyPredictions) {
      const message = formatBlockedActionMessage({
        action: 'Purge database containing stored predictions',
        reasons: [
          `${counts.predictions} prediction row(s) would be permanently destroyed.`,
          'CONFIRM_DESTROY_PREDICTIONS=yes was not provided.'
        ],
        alternatives: purgeBlockedAlternatives()
      });
      // eslint-disable-next-line no-console
      console.error(message);
      process.exit(1);
    }

    const manifest = writePredictionArchive({ counts, dialect: db.dialect });
    // eslint-disable-next-line no-console
    console.warn(
      `Retrieval archive saved before purge: ${manifest.archivePath}\n` +
        'This archive is for manual recovery only and is never used by the app.'
    );
  }

  if (isProduction) {
    // eslint-disable-next-line no-console
    console.warn(
      'Purging LIVE database — all users, predictions, sessions, and cached results will be removed.'
    );
  }

  await resetDatabase(db, { force: confirmDestroyPredictions });
  await ensureBootstrapAdmin();
  // eslint-disable-next-line no-console
  console.log(
    `Database purged and schema recreated (${dialect}${dialect === 'sqlite' ? `, file: ${sqlitePath}` : ''}).`
  );
  // eslint-disable-next-line no-console
  console.log('Bootstrap organiser admin account created (not shown on leaderboard).');
  // eslint-disable-next-line no-console
  console.log(
    'After restart, football-data.org sync may re-import kickoffs and finished results if FOOTBALL_DATA_TOKEN is set.'
  );
  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
