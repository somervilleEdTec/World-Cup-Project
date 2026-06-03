import { groupMatches } from '../data/tournament';
import { setKickoffState } from '../lib/kickoffOverrides';
import type { DatabaseClient } from './database/types';
import { getDb } from './database';

const FALLBACK_FIRST_KICKOFF = '2026-06-11T19:00:00Z';

export async function refreshKickoffCache(db?: DatabaseClient): Promise<void> {
  const client =
    db ??
    (() => {
      try {
        return getDb();
      } catch {
        return undefined;
      }
    })();

  if (!client) {
    setKickoffState({}, FALLBACK_FIRST_KICKOFF);
    return;
  }

  const rows = await client.all<{ match_id: string; kickoff: string }>(
    `SELECT match_id, kickoff FROM match_kickoffs`
  );
  const overrides = Object.fromEntries(rows.map((r) => [r.match_id, r.kickoff]));
  const groupKickoffs = groupMatches.map((m) => overrides[m.id] ?? m.kickoff);
  const earliest = [...groupKickoffs].sort()[0] ?? FALLBACK_FIRST_KICKOFF;
  setKickoffState(overrides, earliest);
}

export async function upsertMatchKickoff(
  matchId: string,
  kickoff: string,
  source: string,
  db?: DatabaseClient
): Promise<void> {
  const client = db ?? getDb();
  const now = new Date().toISOString();
  await client.run(
    `INSERT INTO match_kickoffs (match_id, kickoff, source, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(match_id) DO UPDATE SET
       kickoff = excluded.kickoff,
       source = excluded.source,
       updated_at = excluded.updated_at`,
    [matchId, kickoff, source, now]
  );
  await refreshKickoffCache(client);
}
