import { createApp } from './app';
import { closeDatabase, initDatabase, replaceDatabaseForTests } from './database';
import { createSqliteClient } from './database/sqliteClient';
import { resetDatabase } from './database/migrate';
import { seedGroupMatchMappings } from './services/matchMapping';
import { ensureBootstrapAdmin } from './services/auth';
import { resetKickoffState } from '../lib/kickoffOverrides';

export async function setupTestServer() {
  resetKickoffState();
  await closeDatabase();
  const db = createSqliteClient(':memory:');
  await resetDatabase(db);
  await replaceDatabaseForTests(db);
  await ensureBootstrapAdmin();
  await seedGroupMatchMappings();
  return createApp();
}

export async function teardownTestServer() {
  await closeDatabase();
  resetKickoffState();
}
