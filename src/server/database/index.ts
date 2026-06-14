import type { DatabaseClient } from './types';
import { createSqliteClient } from './sqliteClient';
import { createPostgresClient } from './postgresClient';
import { runMigrations } from './migrate';
import { refreshKickoffCache, repairOfficialKickoffs } from '../kickoffs';
import { ensureBootstrapAdmin } from '../services/auth';

let dbInstance: DatabaseClient | null = null;

export async function initDatabase(options?: {
  databaseUrl?: string;
  sqlitePath?: string;
  skipMigrations?: boolean;
}): Promise<DatabaseClient> {
  if (dbInstance) {
    await repairOfficialKickoffs(dbInstance);
    await refreshKickoffCache(dbInstance);
    return dbInstance;
  }

  const databaseUrl = options?.databaseUrl ?? process.env.DATABASE_URL;
  if (databaseUrl) {
    dbInstance = createPostgresClient(databaseUrl);
  } else {
    const sqlitePath = options?.sqlitePath ?? process.env.SQLITE_PATH ?? 'data.db';
    dbInstance = createSqliteClient(sqlitePath);
  }

  if (!options?.skipMigrations) {
    await runMigrations(dbInstance);
    await ensureBootstrapAdmin();
    await repairOfficialKickoffs(dbInstance);
  }
  await refreshKickoffCache(dbInstance);
  return dbInstance;
}

export function getDb(): DatabaseClient {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

export async function replaceDatabaseForTests(db: DatabaseClient): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
  }
  dbInstance = db;
  await refreshKickoffCache(db);
}
