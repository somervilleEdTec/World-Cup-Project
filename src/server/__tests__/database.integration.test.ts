// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { setupTestServer, teardownTestServer } from '../testHarness';
import { createSqliteClient } from '../database/sqliteClient';
import { resetDatabase, runMigrations } from '../database/migrate';
import { replaceDatabaseForTests, closeDatabase } from '../database';
import {
  hasStoredPredictions,
  readProtectedRowCounts
} from '../../lib/dataProtection';
import { getDb } from '../database';

describe('database integration', () => {
  beforeEach(async () => {
    await closeDatabase();
    const db = createSqliteClient(':memory:');
    await resetDatabase(db);
    await replaceDatabaseForTests(db);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('applies all migrations on a fresh database', async () => {
    const db = getDb();
    const versions = await db.all<{ version: number }>(`SELECT version FROM schema_migrations ORDER BY version`);
    expect(versions.length).toBeGreaterThanOrEqual(3);
  });

  it('tracks protected row counts from live tables', async () => {
    const db = getDb();
    await db.run(
      `INSERT INTO users (id, email, password_hash, display_name, is_admin, must_change_password, created_at)
       VALUES ('u1', 'u1@test.local', 'hash', 'Test', 0, 0, ?)`,
      [new Date().toISOString()]
    );
    await db.run(
      `INSERT INTO predictions (user_id, match_id, state, home_score, away_score, progressing_team_id, reviewed, updated_at)
       VALUES ('u1', 'g-a-1', 'committed', 1, 0, NULL, 1, ?)`,
      [new Date().toISOString()]
    );

    const counts = await readProtectedRowCounts(db);
    expect(hasStoredPredictions(counts)).toBe(true);
    expect(counts.predictions).toBe(1);
    expect(counts.users).toBeGreaterThanOrEqual(1);
  });

  it('blocks resetDatabase when predictions exist without force', async () => {
    const db = getDb();
    await db.run(
      `INSERT INTO predictions (user_id, match_id, state, home_score, away_score, progressing_team_id, reviewed, updated_at)
       VALUES ('u1', 'g-a-1', 'committed', 1, 0, NULL, 1, ?)`,
      [new Date().toISOString()]
    );

    await expect(resetDatabase(db)).rejects.toThrow(/data protection/i);
  });

  it('allows resetDatabase with force even when predictions exist', async () => {
    const db = getDb();
    await db.run(
      `INSERT INTO predictions (user_id, match_id, state, home_score, away_score, progressing_team_id, reviewed, updated_at)
       VALUES ('u1', 'g-a-1', 'committed', 1, 0, NULL, 1, ?)`,
      [new Date().toISOString()]
    );

    await expect(resetDatabase(db, { force: true })).resolves.toBeUndefined();
    const counts = await readProtectedRowCounts(db);
    expect(counts.predictions).toBe(0);
  });
});

describe('database integration — idempotent migration', () => {
  it('runMigrations is safe to call twice on same database', async () => {
    await closeDatabase();
    const db = createSqliteClient(':memory:');
    await resetDatabase(db);
    await replaceDatabaseForTests(db);
    await runMigrations(db);
    await expect(runMigrations(db)).resolves.toBeUndefined();
    await closeDatabase();
  });
});
