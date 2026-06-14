import { GROUP_STAGE_KICKOFFS } from '../data/groupStageKickoffs';
import { KNOCKOUT_STAGE_KICKOFFS } from '../data/knockoutStageKickoffs';
import { OFFICIAL_KICKOFFS, OFFICIAL_KICKOFF_COUNT } from '../data/officialKickoffs';
import { groupMatches } from '../data/tournament';
import { setKickoffState } from '../lib/kickoffOverrides';
import type { DatabaseClient } from './database/types';
import { getDb } from './database';

const FALLBACK_FIRST_KICKOFF = OFFICIAL_KICKOFFS['g-a-1'];

/** Repair stale kickoffs in DB; keep football-data.org overrides when present. */
export async function repairOfficialKickoffs(db?: DatabaseClient): Promise<number> {
  const client = db ?? getDb();
  const now = new Date().toISOString();
  let updated = 0;

  for (const [matchId, kickoff] of Object.entries(OFFICIAL_KICKOFFS)) {
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

/** @deprecated use repairOfficialKickoffs */
export const repairOfficialGroupKickoffs = repairOfficialKickoffs;

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
    setKickoffState({ ...OFFICIAL_KICKOFFS }, FALLBACK_FIRST_KICKOFF);
    return;
  }

  const rows = await client.all<{ match_id: string; kickoff: string; source: string }>(
    `SELECT match_id, kickoff, source FROM match_kickoffs`
  );

  const overrides: Record<string, string> = { ...OFFICIAL_KICKOFFS };
  for (const row of rows) {
    if (row.source === 'football-data.org') {
      overrides[row.match_id] = row.kickoff;
    }
  }

  const groupKickoffs = groupMatches.map((m) => overrides[m.id] ?? m.kickoff);
  const earliest = groupKickoffs.reduce((min, kickoff) => {
    return new Date(kickoff).getTime() < new Date(min).getTime() ? kickoff : min;
  }, FALLBACK_FIRST_KICKOFF);
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

export { OFFICIAL_KICKOFF_COUNT, GROUP_STAGE_KICKOFFS, KNOCKOUT_STAGE_KICKOFFS };
