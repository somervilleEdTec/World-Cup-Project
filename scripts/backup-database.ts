import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

const BACKUP_DIR = process.env.BACKUP_DIR?.trim() || 'backups';
const KEEP_COUNT = Number(process.env.BACKUP_KEEP_COUNT ?? 14);

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function pruneOldBackups(dir: string, prefix: string, extension: string): void {
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(extension))
    .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const file of files.slice(KEEP_COUNT)) {
    fs.unlinkSync(path.join(dir, file.name));
  }
}

function backupSqlite(): string {
  const sqlitePath = process.env.SQLITE_PATH?.trim() || 'data.db';
  const resolved = path.resolve(sqlitePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`SQLite database not found: ${resolved}`);
  }

  ensureDir(BACKUP_DIR);
  const dest = path.join(BACKUP_DIR, `data-${timestamp()}.db`);
  fs.copyFileSync(resolved, dest);
  pruneOldBackups(BACKUP_DIR, 'data-', '.db');
  return dest;
}

function backupPostgres(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for Postgres backup');
  }

  ensureDir(BACKUP_DIR);
  const dest = path.join(BACKUP_DIR, `postgres-${timestamp()}.sql.gz`);
  const result = spawnSync('pg_dump', [databaseUrl], { encoding: 'buffer' });
  if (result.status !== 0) {
    const err = result.stderr?.toString() || 'pg_dump failed';
    throw new Error(err);
  }
  fs.writeFileSync(dest, gzipSync(result.stdout));
  pruneOldBackups(BACKUP_DIR, 'postgres-', '.sql.gz');
  return dest;
}

function main(): void {
  const dest = process.env.DATABASE_URL?.trim() ? backupPostgres() : backupSqlite();
  // eslint-disable-next-line no-console
  console.log(`Database backup written: ${dest}`);
}

main();
