import { groupMatches, teams } from '../../data/tournament';
import { getMatches } from '../../lib/matchResolver';
import { db } from '../db';

export function ensureMatchMappingSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS match_external_ids (
      internal_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      PRIMARY KEY (provider, provider_id)
    );
    CREATE INDEX IF NOT EXISTS idx_match_external_internal ON match_external_ids(internal_id);
  `);
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const ALIASES: Record<string, string> = {
  'united states': 'united states',
  usa: 'united states',
  'korea republic': 'south korea',
  'south korea': 'south korea',
  'cote divoire': 'ivory coast',
  'ivory coast': 'ivory coast',
  turkiye: 'turkiye',
  turkey: 'turkiye',
  'czech republic': 'czechia',
  czechia: 'czechia',
  'dr congo': 'dr congo',
  'democratic republic of the congo': 'dr congo',
  'bosnia herzegovina': 'bosnia and herzegovina',
  'bosnia and herzegovina': 'bosnia and herzegovina',
  england: 'england',
  scotland: 'scotland'
};

export function teamIdFromProviderName(name: string): string | null {
  const normalized = ALIASES[normalizeName(name)] ?? normalizeName(name);
  const team = teams.find((t) => normalizeName(t.name) === normalized);
  return team?.id ?? null;
}

export function registerExternalMapping(internalId: string, provider: string, providerId: string) {
  db.prepare(
    `INSERT INTO match_external_ids (internal_id, provider, provider_id)
     VALUES (?, ?, ?)
     ON CONFLICT(provider, provider_id) DO UPDATE SET internal_id = excluded.internal_id`
  ).run(internalId, provider, providerId);
}

export function internalIdFromProvider(provider: string, providerId: string): string | null {
  const row = db
    .prepare(`SELECT internal_id FROM match_external_ids WHERE provider = ? AND provider_id = ?`)
    .get(provider, providerId) as { internal_id: string } | undefined;
  return row?.internal_id ?? null;
}

/** Map provider fixture to internal id by registered mapping or home/away team names. */
export function resolveInternalMatchId(
  provider: string,
  providerId: string,
  homeName: string,
  awayName: string
): string | null {
  const existing = internalIdFromProvider(provider, providerId);
  if (existing) return existing;

  const homeId = teamIdFromProviderName(homeName);
  const awayId = teamIdFromProviderName(awayName);
  if (!homeId || !awayId) return null;

  const allMatches = getMatches();
  const found = allMatches.find(
    (m) =>
      (m.homeTeamId === homeId && m.awayTeamId === awayId) ||
      (m.homeTeamId === awayId && m.awayTeamId === homeId)
  );
  if (!found) return null;

  registerExternalMapping(found.id, provider, providerId);
  return found.id;
}

export function seedGroupMatchMappings(provider = 'football-data.org') {
  groupMatches.forEach((match) => {
    registerExternalMapping(match.id, provider, `seed-${match.id}`);
  });
}
