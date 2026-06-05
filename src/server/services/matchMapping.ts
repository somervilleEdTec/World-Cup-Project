import { groupMatches, teams } from '../../data/tournament';
import { getMatches } from '../../lib/matchResolver';
import { ActualResult } from '../../types';
import { getDb } from '../database';

type ResultsContext = Record<string, ActualResult>;

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
  'bosnia h': 'bosnia and herzegovina',
  england: 'england',
  scotland: 'scotland',
  'congo dr': 'dr congo'
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

export async function internalIdFromProvider(
  provider: string,
  providerId: string
): Promise<string | null> {
  const db = getDb();
  const row = await db.get<{ internal_id: string }>(
    `SELECT internal_id FROM match_external_ids WHERE provider = ? AND provider_id = ?`,
    [provider, providerId]
  );
  return row?.internal_id ?? null;
}

export type MappingFailureReason =
  | 'already_mapped'
  | 'missing_home_team'
  | 'missing_away_team'
  | 'unmapped_home_team'
  | 'unmapped_away_team'
  | 'no_matching_internal_fixture';

function findInternalMatchByTeamIds(
  homeId: string,
  awayId: string,
  actuals: ResultsContext = {}
) {
  return getMatches({}, actuals).find(
    (m) =>
      (m.homeTeamId === homeId && m.awayTeamId === awayId) ||
      (m.homeTeamId === awayId && m.awayTeamId === homeId)
  );
}

export function explainMappingFailure(
  homeName: string | null | undefined,
  awayName: string | null | undefined,
  existingId: string | null,
  actuals: ResultsContext = {}
): MappingFailureReason | 'mappable' {
  if (existingId) return 'already_mapped';
  if (!homeName) return 'missing_home_team';
  if (!awayName) return 'missing_away_team';

  const homeId = teamIdFromProviderName(homeName);
  const awayId = teamIdFromProviderName(awayName);
  if (!homeId) return 'unmapped_home_team';
  if (!awayId) return 'unmapped_away_team';

  if (!findInternalMatchByTeamIds(homeId, awayId, actuals)) {
    return 'no_matching_internal_fixture';
  }
  return 'mappable';
}

/** Map provider fixture to internal id by registered mapping or home/away team names. */
export async function resolveInternalMatchId(
  provider: string,
  providerId: string,
  homeName: string | null | undefined,
  awayName: string | null | undefined,
  actuals: ResultsContext = {}
): Promise<string | null> {
  const existing = await internalIdFromProvider(provider, providerId);
  const failure = explainMappingFailure(homeName, awayName, existing, actuals);
  if (failure === 'already_mapped') return existing;
  if (failure !== 'mappable') return null;

  const homeId = teamIdFromProviderName(homeName);
  const awayId = teamIdFromProviderName(awayName);
  if (!homeId || !awayId) return null;

  const found = findInternalMatchByTeamIds(homeId, awayId, actuals);
  if (!found) return null;

  await registerExternalMapping(found.id, provider, providerId);
  return found.id;
}

export async function seedGroupMatchMappings(provider = 'football-data.org'): Promise<void> {
  for (const match of groupMatches) {
    await registerExternalMapping(match.id, provider, `seed-${match.id}`);
  }
}
