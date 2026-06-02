import Database from 'better-sqlite3';
import path from 'node:path';
import type { DatabaseClient } from './types';

function createClient(native: Database.Database): DatabaseClient {
  const client: DatabaseClient = {
    dialect: 'sqlite',
    async exec(sql: string) {
      native.exec(sql);
    },
    async get<T>(sql: string, params: unknown[] = []) {
      return native.prepare(sql).get(...params) as T | undefined;
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return native.prepare(sql).all(...params) as T[];
    },
    async run(sql: string, params: unknown[] = []) {
      native.prepare(sql).run(...params);
    },
    async transaction<T>(fn: (tx: DatabaseClient) => Promise<T>) {
      // better-sqlite3 transactions are synchronous; run async fn then wrap critical paths
      // in native.transaction at call sites, or accept sequential execution for dev.
      return fn(client);
    },
    async close() {
      native.close();
    }
  };
  return client;
}

export function createSqliteClient(dbPath: string): DatabaseClient {
  const resolved = dbPath === ':memory:' ? ':memory:' : path.resolve(process.cwd(), dbPath);
  const native = new Database(resolved);
  if (resolved !== ':memory:') {
    native.pragma('journal_mode = WAL');
  }
  return createClient(native);
}

/** Run a synchronous callback inside a SQLite transaction (for commit batches). */
export function sqliteTransaction<T>(native: Database.Database, fn: () => T): T {
  return native.transaction(fn)();
}

export function openSqliteNative(dbPath: string): Database.Database {
  const resolved = dbPath === ':memory:' ? ':memory:' : path.resolve(process.cwd(), dbPath);
  const native = new Database(resolved);
  if (resolved !== ':memory:') {
    native.pragma('journal_mode = WAL');
  }
  return native;
}
