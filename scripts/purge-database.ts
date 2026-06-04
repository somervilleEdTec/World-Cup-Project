import 'dotenv/config';
import { closeDatabase, getDb, initDatabase } from '../src/server/database/index.js';
import { resetDatabase } from '../src/server/database/migrate.js';
import { ensureBootstrapAdmin } from '../src/server/services/auth.js';

const confirmLive =
  process.env.CONFIRM_LIVE_DB_PURGE === 'yes' || process.argv.includes('--confirm-live');

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !confirmLive) {
    // eslint-disable-next-line no-console
    console.error(
      'Refusing to purge production database without explicit confirmation.\n' +
        'On the live server run:\n' +
        '  CONFIRM_LIVE_DB_PURGE=yes npm run db:purge\n' +
        'or:\n' +
        '  npm run db:purge:live\n' +
        'See docs/PRODUCTION.md § Wipe live database.'
    );
    process.exit(1);
  }

  if (isProduction) {
    // eslint-disable-next-line no-console
    console.warn(
      'Purging LIVE database — all users, predictions, sessions, and cached results will be removed.'
    );
  }

  await initDatabase();
  const db = getDb();
  const dialect = db.dialect;
  const sqlitePath = process.env.SQLITE_PATH ?? 'data.db';

  await resetDatabase(db);
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
