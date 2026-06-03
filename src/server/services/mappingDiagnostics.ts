import { groupMatches } from '../../data/tournament';
import { getMatches } from '../../lib/matchResolver';
import { fetchCompetitionFixtures, PROVIDER } from '../../services/footballDataService';
import { getDb } from '../database';
import {
  explainMappingFailure,
  internalIdFromProvider,
  resolveInternalMatchId,
  type MappingFailureReason
} from './matchMapping';

export interface MappingDiagnosticsReport {
  generatedAt: string;
  provider: string;
  totals: {
    providerFixtures: number;
    internalGroupMatches: number;
    kickoffsInDatabase: number;
    providerMappingsInDatabase: number;
  };
  summary: {
    mapped: number;
    skipped: number;
    groupStageMapped: number;
    groupStageTotal: number;
    knockoutMapped: number;
    knockoutTotal: number;
  };
  skipReasons: Record<MappingFailureReason, number>;
  unmappedTeamNames: Array<{ name: string; count: number }>;
  samples: Array<{
    providerId: string;
    homeName: string | null;
    awayName: string | null;
    status: string;
    kickoff: string;
    reason: MappingFailureReason;
  }>;
  notes: string[];
}

function isGroupStageFixture(stage: string | undefined, group: string | undefined): boolean {
  return stage === 'GROUP_STAGE' || Boolean(group?.startsWith('GROUP_'));
}

export async function buildMappingDiagnostics(
  apiToken?: string
): Promise<MappingDiagnosticsReport> {
  const token = apiToken ?? process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    throw new Error('FOOTBALL_DATA_TOKEN missing');
  }

  const db = getDb();
  const fixtures = await fetchCompetitionFixtures(token);
  const kickoffRow = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM match_kickoffs`
  );
  const mappingRow = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM match_external_ids WHERE provider = ?`,
    [PROVIDER]
  );

  const skipReasons = {} as Record<MappingFailureReason, number>;
  const unmappedCounts = new Map<string, number>();
  const samples: MappingDiagnosticsReport['samples'] = [];

  let mapped = 0;
  let skipped = 0;
  let groupStageMapped = 0;
  let groupStageTotal = 0;
  let knockoutMapped = 0;
  let knockoutTotal = 0;

  for (const fixture of fixtures) {
    const existing = await internalIdFromProvider(PROVIDER, fixture.providerId);
    const reason = explainMappingFailure(fixture.homeName, fixture.awayName, existing);
    const groupStage = isGroupStageFixture(fixture.stage, fixture.group);

    if (groupStage) groupStageTotal += 1;
    else knockoutTotal += 1;

    if (reason === 'already_mapped' || reason === 'mappable') {
      const internalId = await resolveInternalMatchId(
        PROVIDER,
        fixture.providerId,
        fixture.homeName,
        fixture.awayName
      );
      if (internalId) {
        mapped += 1;
        if (groupStage) groupStageMapped += 1;
        else knockoutMapped += 1;
        continue;
      }
    }

    skipped += 1;
    const finalReason =
      reason === 'mappable' || reason === 'already_mapped'
        ? 'no_matching_internal_fixture'
        : reason;
    skipReasons[finalReason] = (skipReasons[finalReason] ?? 0) + 1;
    if (finalReason === 'unmapped_home_team' && fixture.homeName) {
      unmappedCounts.set(fixture.homeName, (unmappedCounts.get(fixture.homeName) ?? 0) + 1);
    }
    if (finalReason === 'unmapped_away_team' && fixture.awayName) {
      unmappedCounts.set(fixture.awayName, (unmappedCounts.get(fixture.awayName) ?? 0) + 1);
    }

    if (samples.length < 25) {
      samples.push({
        providerId: fixture.providerId,
        homeName: fixture.homeName,
        awayName: fixture.awayName,
        status: fixture.status,
        kickoff: fixture.kickoff,
        reason: finalReason
      });
    }
  }

  const unmappedTeamNames = [...unmappedCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const notes = [
    'Group-stage fixtures should map 72/72 when team names are present.',
    'Knockout fixtures with unassigned teams (null home/away) are expected until FIFA confirms participants.',
    'Add aliases in matchMapping.ts for any unmapped_team_names entries.'
  ];

  return {
    generatedAt: new Date().toISOString(),
    provider: PROVIDER,
    totals: {
      providerFixtures: fixtures.length,
      internalGroupMatches: groupMatches.length,
      kickoffsInDatabase: kickoffRow?.count ?? 0,
      providerMappingsInDatabase: mappingRow?.count ?? 0
    },
    summary: {
      mapped,
      skipped,
      groupStageMapped,
      groupStageTotal,
      knockoutMapped,
      knockoutTotal
    },
    skipReasons,
    unmappedTeamNames,
    samples,
    notes
  };
}

/** Quick check used in tests without external API. */
export function classifyFixtureLocally(
  homeName: string | null | undefined,
  awayName: string | null | undefined,
  existingId: string | null = null
): MappingFailureReason | 'mappable' {
  return explainMappingFailure(homeName, awayName, existingId);
}
