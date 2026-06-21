import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseClient } from './types';
import {
  analyzeMigrationSql,
  assertDataProtectionOverrideAllowed,
  formatBlockedActionMessage,
  hasStoredPredictions,
  migrationBlockedAlternatives,
  readProtectedRowCounts,
  resetBlockedAlternatives
} from '../../lib/dataProtection';

const MIGRATION_FILES: Record<number, { sqlite: string; postgres: string }> = {
  1: { sqlite: '001_initial.sqlite.sql', postgres: '001_initial.postgres.sql' },
  2: { sqlite: '002_accepted_groups.sqlite.sql', postgres: '002_accepted_groups.postgres.sql' },
  3: {
    sqlite: '003_user_password_flags.sqlite.sql',
    postgres: '003_user_password_flags.postgres.sql'
  },
  4: {
    sqlite: '004_match_discipline.sqlite.sql',
    postgres: '004_match_discipline.postgres.sql'
  }
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
  const counts = await readProtectedRowCounts(db);
  const predictionsExist = hasStoredPredictions(counts);

  for (let version = 1; version <= LATEST_VERSION; version += 1) {
    if (await isVersionApplied(db, version)) continue;

    const files = MIGRATION_FILES[version];
    const fileName = db.dialect === 'postgres' ? files.postgres : files.sqlite;
    const sql = fs.readFileSync(path.resolve(process.cwd(), 'migrations', fileName), 'utf8');
    const risk = analyzeMigrationSql(sql);

    if (risk.destructive && predictionsExist) {
      assertDataProtectionOverrideAllowed(`migration ${version} (${fileName})`);
      if (process.env.DATA_PROTECTION_OVERRIDE !== 'yes') {
        const message = formatBlockedActionMessage({
          action: `Apply migration ${version} (${fileName})`,
          reasons: [
            `${counts.predictions} prediction row(s) are stored and must be preserved.`,
            ...risk.reasons
          ],
          alternatives: migrationBlockedAlternatives()
        });
        // eslint-disable-next-line no-console
        console.error(message);
        throw new Error(`Migration ${version} blocked by data protection.`);
      }
    }

    await db.exec(sql);
    const now = new Date().toISOString();
    await db.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`, [
      version,
      now
    ]);
  }
}

export async function resetDatabase(
  db: DatabaseClient,
  options?: { force?: boolean }
): Promise<void> {
  const counts = await readProtectedRowCounts(db);
  if (hasStoredPredictions(counts) && !options?.force) {
    assertDataProtectionOverrideAllowed('resetDatabase');
    if (process.env.DATA_PROTECTION_OVERRIDE !== 'yes') {
      const message = formatBlockedActionMessage({
        action: 'Reset database (drop all tables and recreate schema)',
        reasons: [
          `${counts.predictions} prediction row(s) would be permanently destroyed.`,
          `${counts.users} user row(s) and ${counts.results} result row(s) would also be removed.`
        ],
        alternatives: resetBlockedAlternatives()
      });
      // eslint-disable-next-line no-console
      console.error(message);
      throw new Error('Database reset blocked by data protection.');
    }
  }

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
