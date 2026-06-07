import {
  fetchCompetitionFixtures,
  fetchLatestResults,
  WORLD_CUP_CODE
} from '../services/footballDataService';
import { GROUP_STAGE_KICKOFFS } from '../data/groupStageKickoffs';
import { getMatches } from './matchResolver';
import {
  explainMappingFailure,
  parseProviderGroup,
  teamIdFromProviderName
} from '../server/services/matchMapping';

const API_BASE = 'https://api.football-data.org/v4';
const FIFA_FIXTURES_URL =
  'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures';

export function findInternalMatchIdDryRun(
  homeName: string | null | undefined,
  awayName: string | null | undefined,
  group?: string | null
): string | null {
  const homeId = teamIdFromProviderName(homeName);
  const awayId = teamIdFromProviderName(awayName);
  if (!homeId || !awayId) return null;
  const scopedGroup = parseProviderGroup(group);
  const found = getMatches({}, {}).find((m) => {
    const teamMatch =
      (m.homeTeamId === homeId && m.awayTeamId === awayId) ||
      (m.homeTeamId === awayId && m.awayTeamId === homeId);
    if (!teamMatch) return false;
    if (scopedGroup && m.group && m.group !== scopedGroup) return false;
    return true;
  });
  return found?.id ?? null;
}

export interface TokenVerificationResult {
  ok: boolean;
  httpStatus: number;
  message: string;
  competition?: {
    id: number;
    name: string;
    code: string;
    type: string;
    currentSeason?: { startDate?: string; endDate?: string };
  };
  rateLimit?: {
    available: string | null;
    limit: string | null;
  };
}

export async function verifyFootballDataToken(apiToken: string): Promise<TokenVerificationResult> {
  const response = await fetch(`${API_BASE}/competitions/${WORLD_CUP_CODE}`, {
    headers: { 'X-Auth-Token': apiToken }
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    id?: number;
    name?: string;
    code?: string;
    type?: string;
    currentSeason?: { startDate?: string; endDate?: string };
  };

  if (!response.ok) {
    return {
      ok: false,
      httpStatus: response.status,
      message: body.message ?? `HTTP ${response.status}`
    };
  }

  return {
    ok: true,
    httpStatus: response.status,
    message: 'Token accepted — World Cup competition reachable.',
    competition: {
      id: body.id ?? 0,
      name: body.name ?? 'FIFA World Cup',
      code: body.code ?? WORLD_CUP_CODE,
      type: body.type ?? 'CUP',
      currentSeason: body.currentSeason
    },
    rateLimit: {
      available: response.headers.get('X-Requests-Available'),
      limit: response.headers.get('X-RequestCounter-Limit')
    }
  };
}

export interface KickoffCrossCheckRow {
  internalId: string | null;
  homeName: string | null;
  awayName: string | null;
  group?: string;
  apiKickoff: string;
  fifaKickoff: string | null;
  kickoffMatch: boolean;
  mappingReason: string;
}

export async function crossCheckKickoffs(apiToken: string): Promise<{
  rows: KickoffCrossCheckRow[];
  mappedGroup: number;
  kickoffMatchesFifa: number;
  kickoffMismatches: number;
}> {
  const fixtures = await fetchCompetitionFixtures(apiToken);
  const groupFixtures = fixtures.filter((f) => parseProviderGroup(f.group));
  const rows: KickoffCrossCheckRow[] = [];
  let mappedGroup = 0;
  let kickoffMatchesFifa = 0;
  let kickoffMismatches = 0;

  for (const fixture of groupFixtures) {
    const homeId = teamIdFromProviderName(fixture.homeName);
    const awayId = teamIdFromProviderName(fixture.awayName);
    const reason = explainMappingFailure(
      fixture.homeName,
      fixture.awayName,
      null,
      {},
      fixture.group
    );

    let internalId: string | null = null;
    if (reason === 'mappable') {
      internalId = findInternalMatchIdDryRun(fixture.homeName, fixture.awayName, fixture.group);
      if (internalId) mappedGroup += 1;
    }

    const fifaKickoff = internalId ? (GROUP_STAGE_KICKOFFS[internalId] ?? null) : null;
    const kickoffMatch = fifaKickoff ? fixture.kickoff === fifaKickoff : false;
    if (fifaKickoff) {
      if (kickoffMatch) kickoffMatchesFifa += 1;
      else kickoffMismatches += 1;
    }

    rows.push({
      internalId,
      homeName: fixture.homeName,
      awayName: fixture.awayName,
      group: parseProviderGroup(fixture.group) ?? undefined,
      apiKickoff: fixture.kickoff,
      fifaKickoff,
      kickoffMatch,
      mappingReason: reason
    });
  }

  return { rows, mappedGroup, kickoffMatchesFifa, kickoffMismatches };
}

export interface FinishedMatchCrossCheck {
  providerId: string;
  homeName: string | null;
  awayName: string | null;
  homeScore: number;
  awayScore: number;
  internalId: string | null;
  mappable: boolean;
  fifaReference: string;
}

export async function listFinishedMatchesForCrossCheck(
  apiToken: string
): Promise<FinishedMatchCrossCheck[]> {
  const results = await fetchLatestResults(apiToken);
  return results.map((row) => {
    const reason = explainMappingFailure(row.homeName, row.awayName, null, {}, undefined);
    const internalId = reason === 'mappable' ? findInternalMatchIdDryRun(row.homeName, row.awayName) : null;
    return {
      providerId: row.providerId,
      homeName: row.homeName,
      awayName: row.awayName,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      internalId,
      mappable: reason === 'mappable',
      fifaReference: `${FIFA_FIXTURES_URL} (${row.homeName} vs ${row.awayName})`
    };
  });
}

export { FIFA_FIXTURES_URL };
