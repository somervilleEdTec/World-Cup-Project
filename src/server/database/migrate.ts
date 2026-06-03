import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseClient } from './types';

const MIGRATION_FILES: Record<number, { sqlite: string; postgres: string }> = {
  1: { sqlite: '001_initial.sqlite.sql', postgres: '001_initial.postgres.sql' },
  2: { sqlite: '002_accepted_groups.sqlite.sql', postgres: '002_accepted_groups.postgres.sql' }
};

const LATEST_VERSION = Math.max(...Object.keys(MIGRATION_FILES).map(Number));

async function isVersionApplied(db: DatabaseClient, version: number): Promise<boolean> {
  try {
    const row = await db.get<{ version: number }>(
      `SELECT version FROM schema_migrations WHERE version = ?`,
      [version]
    );
    return Boolean(row);
  } catch {
    return false;
  }
}

export async function runMigrations(db: DatabaseClient): Promise<void> {
  for (let version = 1; version <= LATEST_VERSION; version += 1) {
    if (await isVersionApplied(db, version)) continue;

    const files = MIGRATION_FILES[version];
    const fileName = db.dialect === 'postgres' ? files.postgres : files.sqlite;
    const sql = fs.readFileSync(path.resolve(process.cwd(), 'migrations', fileName), 'utf8');
    await db.exec(sql);
    const now = new Date().toISOString();
    await db.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`, [
      version,
      now
    ]);
  }
}

export async function resetDatabase(db: DatabaseClient): Promise<void> {
  const tables = [
    'match_kickoffs',
    'match_external_ids',
    'sync_status',
    'results',
    'predictions',
    'prediction_meta',
    'sessions',
    'users',
    'schema_migrations'
  ];
  if (db.dialect === 'postgres') {
    for (const table of tables) {
      await db.run(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
  } else {
    for (const table of tables) {
      await db.run(`DROP TABLE IF EXISTS ${table}`);
    }
  }
  await runMigrations(db);
}
