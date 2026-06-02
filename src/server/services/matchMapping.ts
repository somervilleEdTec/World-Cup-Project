import { groupMatches, teams } from '../../data/tournament';
import { getMatches } from '../../lib/matchResolver';
import { getDb } from '../database';

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

export function teamIdFromProviderName(name: string | null | undefined): string | null {
  if (!name) return null;
  const normalized = ALIASES[normalizeName(name)] ?? normalizeName(name);
  const team = teams.find((t) => normalizeName(t.name) === normalized);
  return team?.id ?? null;
}

export async function registerExternalMapping(
  internalId: string,
  provider: string,
  providerId: string
): Promise<void> {
  const db = getDb();
  await db.run(
    `INSERT INTO match_external_ids (internal_id, provider, provider_id)
     VALUES (?, ?, ?)
     ON CONFLICT(provider, provider_id) DO UPDATE SET internal_id = excluded.internal_id`,
    [internalId, provider, providerId]
  );
}

export async function internalIdFromProvider(provider: string, providerId: string): Promise<string | null> {
  const db = getDb();
  const row = await db.get<{ internal_id: string }>(
    `SELECT internal_id FROM match_external_ids WHERE provider = ? AND provider_id = ?`,
    [provider, providerId]
  );
  return row?.internal_id ?? null;
}

/** Map provider fixture to internal id by registered mapping or home/away team names. */
export async function resolveInternalMatchId(
  provider: string,
  providerId: string,
  homeName: string | null | undefined,
  awayName: string | null | undefined
): Promise<string | null> {
  const existing = await internalIdFromProvider(provider, providerId);
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

  await registerExternalMapping(found.id, provider, providerId);
  return found.id;
}

export async function seedGroupMatchMappings(provider = 'football-data.org'): Promise<void> {
  for (const match of groupMatches) {
    await registerExternalMapping(match.id, provider, `seed-${match.id}`);
  }
}
