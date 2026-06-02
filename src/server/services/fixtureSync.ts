import { fetchCompetitionFixtures, PROVIDER } from '../../services/footballDataService';
import { upsertMatchKickoff } from '../kickoffs';
import { resolveInternalMatchId } from './matchMapping';

export async function syncKickoffsFromFootballData(apiToken: string) {
  const fixtures = await fetchCompetitionFixtures(apiToken);
  let mapped = 0;
  let skipped = 0;

  for (const fixture of fixtures) {
    const internalId = await resolveInternalMatchId(
      PROVIDER,
      fixture.providerId,
      fixture.homeName,
      fixture.awayName
    );
    if (!internalId) {
      skipped += 1;
      continue;
    }
    await upsertMatchKickoff(internalId, fixture.kickoff, 'football-data.org');
    mapped += 1;
  }

  return { ok: true, mapped, skipped, total: fixtures.length };
}
