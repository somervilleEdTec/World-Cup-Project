import { vi } from 'vitest';
import { createApp } from './app';
import { closeDatabase, initDatabase, replaceDatabaseForTests } from './database';
import { createSqliteClient } from './database/sqliteClient';
import { resetDatabase } from './database/migrate';
import { seedGroupMatchMappings } from './services/matchMapping';
import { ensureBootstrapAdmin } from './services/auth';
import { resetKickoffState } from '../lib/kickoffOverrides';

/** Frozen instant before any tournament prediction locks (first kickoff 2026-06-11). */
export const TEST_NOW_ISO = '2026-06-01T00:00:00.000Z';

export async function setupTestServer() {
  vi.useFakeTimers({ now: new Date(TEST_NOW_ISO), toFake: ['Date'] });
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
  vi.useRealTimers();
}
