import { fetchCompetitionFixtures, PROVIDER } from '../../services/footballDataService';
import { upsertMatchKickoff } from '../kickoffs';
import { explainMappingFailure, internalIdFromProvider, resolveInternalMatchId } from './matchMapping';
import type { MappingFailureReason } from './matchMapping';

export async function syncKickoffsFromFootballData(apiToken: string) {
  const fixtures = await fetchCompetitionFixtures(apiToken);
  let mapped = 0;
  let skipped = 0;
  const skipReasons = {} as Record<MappingFailureReason, number>;

  for (const fixture of fixtures) {
    const existing = await internalIdFromProvider(PROVIDER, fixture.providerId);
    const reason = explainMappingFailure(fixture.homeName, fixture.awayName, existing);

    if (reason !== 'mappable' && reason !== 'already_mapped') {
      skipped += 1;
      skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
      continue;
    }

    const internalId = await resolveInternalMatchId(
      PROVIDER,
      fixture.providerId,
      fixture.homeName,
      fixture.awayName
    );
    if (!internalId) {
      skipped += 1;
      skipReasons.no_matching_internal_fixture =
        (skipReasons.no_matching_internal_fixture ?? 0) + 1;
      continue;
    }

    await upsertMatchKickoff(internalId, fixture.kickoff, 'football-data.org');
    mapped += 1;
  }

  return { ok: true, mapped, skipped, total: fixtures.length, skipReasons };
}
