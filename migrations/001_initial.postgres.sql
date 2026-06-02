CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS predictions (
  user_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  state TEXT NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  progressing_team_id TEXT,
  reviewed INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(user_id, match_id, state)
);

CREATE TABLE IF NOT EXISTS prediction_meta (
  user_id TEXT PRIMARY KEY,
  commit_version INTEGER NOT NULL DEFAULT 1,
  committed_at TIMESTAMPTZ NOT NULL,
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
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ
);

INSERT INTO sync_status (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS match_external_ids (
  internal_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  PRIMARY KEY (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_match_external_internal ON match_external_ids(internal_id);

CREATE TABLE IF NOT EXISTS match_kickoffs (
  match_id TEXT PRIMARY KEY,
  kickoff TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'static',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
