import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseClient } from './types';

const MIGRATION_VERSION = 1;

function migrationFile(dialect: 'sqlite' | 'postgres'): string {
  const name = dialect === 'postgres' ? '001_initial.postgres.sql' : '001_initial.sqlite.sql';
  return path.resolve(process.cwd(), 'migrations', name);
}

export async function runMigrations(db: DatabaseClient): Promise<void> {
  try {
    const hasMigrations = await db.get<{ version: number }>(
      `SELECT version FROM schema_migrations WHERE version = ?`,
      [MIGRATION_VERSION]
    );
    if (hasMigrations) return;
  } catch {
    // schema_migrations not created yet
  }

  const sql = fs.readFileSync(migrationFile(db.dialect), 'utf8');
  await db.exec(sql);
  const now = new Date().toISOString();
  await db.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`, [
    MIGRATION_VERSION,
    now
  ]);
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
