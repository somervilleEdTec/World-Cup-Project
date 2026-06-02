import Database from 'better-sqlite3';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS predictions (
  user_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  state TEXT NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  progressing_team_id TEXT,
  reviewed INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, match_id, state)
);

CREATE TABLE IF NOT EXISTS prediction_meta (
  user_id TEXT PRIMARY KEY,
  commit_version INTEGER NOT NULL DEFAULT 1,
  committed_at TEXT NOT NULL,
  group_locked INTEGER NOT NULL DEFAULT 0,
  bonus_draft TEXT,
  bonus_committed TEXT,
  affected_matches TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS results (
  match_id TEXT PRIMARY KEY,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  progressing_team_id TEXT,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_success_at TEXT,
  last_error TEXT,
  last_attempt_at TEXT
);

INSERT OR IGNORE INTO sync_status (id) VALUES (1);

CREATE TABLE IF NOT EXISTS match_external_ids (
  internal_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  PRIMARY KEY (provider, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_match_external_internal ON match_external_ids(internal_id);
`);
