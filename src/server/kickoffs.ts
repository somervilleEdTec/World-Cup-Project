import { GROUP_STAGE_KICKOFFS } from '../data/groupStageKickoffs';
import { groupMatches } from '../data/tournament';
import { setKickoffState } from '../lib/kickoffOverrides';
import type { DatabaseClient } from './database/types';
import { getDb } from './database';

const FALLBACK_FIRST_KICKOFF = GROUP_STAGE_KICKOFFS['g-a-1'];

/** Repair stale group kickoffs in DB; keep football-data.org overrides when present. */
export async function repairOfficialGroupKickoffs(db?: DatabaseClient): Promise<number> {
  const client = db ?? getDb();
  const now = new Date().toISOString();
  let updated = 0;

  for (const [matchId, kickoff] of Object.entries(GROUP_STAGE_KICKOFFS)) {
    const existing = await client.get<{ kickoff: string; source: string }>(
      `SELECT kickoff, source FROM match_kickoffs WHERE match_id = ?`,
      [matchId]
    );
    if (existing?.source === 'football-data.org') continue;

    if (!existing || existing.kickoff !== kickoff || existing.source !== 'fifa-official-static') {
      await client.run(
        `INSERT INTO match_kickoffs (match_id, kickoff, source, updated_at)
         VALUES (?, ?, 'fifa-official-static', ?)
         ON CONFLICT(match_id) DO UPDATE SET
           kickoff = excluded.kickoff,
           source = excluded.source,
           updated_at = excluded.updated_at`,
        [matchId, kickoff, now]
      );
      updated += 1;
    }
  }

  return updated;
}

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
    setKickoffState({ ...GROUP_STAGE_KICKOFFS }, FALLBACK_FIRST_KICKOFF);
    return;
  }

  const rows = await client.all<{ match_id: string; kickoff: string; source: string }>(
    `SELECT match_id, kickoff, source FROM match_kickoffs`
  );

  const overrides: Record<string, string> = { ...GROUP_STAGE_KICKOFFS };
  for (const row of rows) {
    const isGroup = row.match_id.startsWith('g-');
    if (isGroup && row.source !== 'football-data.org') continue;
    overrides[row.match_id] = row.kickoff;
  }

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
