import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import type { ProtectedRowCounts } from './dataProtection';

/** Retrieval-only archive — never read by the app, deploy, migrate, or restore scripts. */
export const DEFAULT_PREDICTION_ARCHIVE_DIR = 'prediction-archive-retrieval-only';

export interface PredictionArchiveManifest {
  createdAt: string;
  archiveType: 'retrieval-only';
  dialect: 'sqlite' | 'postgres';
  sourcePath?: string;
  archivePath: string;
  deployCommit?: string;
  counts: ProtectedRowCounts;
  note: string;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeReadme(dir: string): void {
  const readmePath = path.join(dir, 'README.txt');
  if (fs.existsSync(readmePath)) return;

  fs.writeFileSync(
    readmePath,
    [
      'PREDICTION RETRIEVAL ARCHIVE — DO NOT USE FOR AUTOMATED RESTORE',
      '',
      'This directory holds append-only snapshots for human disaster recovery only.',
      'The live app, deploy scripts, migrate, and npm run db:backup never read from here.',
      '',
      'Each snapshot includes:',
      '  - full database copy (SQLite) or pg_dump (Postgres)',
      '  - manifest JSON with row counts and timestamp',
      '',
      'To recover predictions manually:',
      '  1. Stop worldcup + worldcup-jobs services',
      '  2. Copy the chosen snapshot over data.db (or restore Postgres dump)',
      '  3. Restart services',
      '',
      'See docs/DATA_PROTECTION.md'
    ].join('\n'),
    'utf8'
  );
}

function writeManifest(manifestPath: string, manifest: PredictionArchiveManifest): void {
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export function resolvePredictionArchiveDir(): string {
  return process.env.PREDICTION_ARCHIVE_DIR?.trim() || DEFAULT_PREDICTION_ARCHIVE_DIR;
}

export function writePredictionArchive(options: {
  counts: ProtectedRowCounts;
  dialect: 'sqlite' | 'postgres';
}): PredictionArchiveManifest {
  const archiveDir = path.resolve(resolvePredictionArchiveDir());
  ensureDir(archiveDir);
  writeReadme(archiveDir);

  const createdAt = new Date().toISOString();
  const deployCommit = process.env.DEPLOY_COMMIT?.trim() || process.env.GITHUB_SHA?.trim();

  if (options.dialect === 'postgres') {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for Postgres prediction archive');
    }
    const archivePath = path.join(archiveDir, `predictions-retrieval-${timestamp()}.sql.gz`);
    const result = spawnSync('pg_dump', [databaseUrl], { encoding: 'buffer' });
    if (result.status !== 0) {
      throw new Error(result.stderr?.toString() || 'pg_dump failed for prediction archive');
    }
    fs.writeFileSync(archivePath, gzipSync(result.stdout));
    const manifestPath = `${archivePath}.manifest.json`;
    const manifest: PredictionArchiveManifest = {
      createdAt,
      archiveType: 'retrieval-only',
      dialect: 'postgres',
      archivePath,
      deployCommit,
      counts: options.counts,
      note: 'Retrieval-only archive — never used by automated deploy or app runtime.'
    };
    writeManifest(manifestPath, manifest);
    return manifest;
  }

  const sqlitePath = process.env.SQLITE_PATH?.trim() || 'data.db';
  const resolved = path.resolve(sqlitePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`SQLite database not found: ${resolved}`);
  }

  const archivePath = path.join(archiveDir, `predictions-retrieval-${timestamp()}.db`);
  fs.copyFileSync(resolved, archivePath);
  const manifestPath = `${archivePath}.manifest.json`;
  const manifest: PredictionArchiveManifest = {
    createdAt,
    archiveType: 'retrieval-only',
    dialect: 'sqlite',
    sourcePath: resolved,
    archivePath,
    deployCommit,
    counts: options.counts,
    note: 'Retrieval-only archive — never used by automated deploy or app runtime.'
  };
  writeManifest(manifestPath, manifest);
  return manifest;
}
