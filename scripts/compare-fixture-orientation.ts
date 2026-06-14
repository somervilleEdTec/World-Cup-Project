/**
 * Compare internal group fixture home/away against football-data.org.
 * Usage: npx tsx scripts/compare-fixture-orientation.ts
 */
import 'dotenv/config';
import { groupMatches, teams } from '../src/data/tournament';
import { fetchCompetitionFixtures } from '../src/services/footballDataService';
import { getFootballDataToken } from '../src/lib/runtimeConfig';
import {
  parseProviderGroup,
  resolveInternalMatchId,
  teamIdFromProviderName
} from '../src/server/services/matchMapping';

async function main() {
  const token = getFootballDataToken();
  if (!token) {
    console.error('FOOTBALL_DATA_TOKEN required');
    process.exit(1);
  }

  const fixtures = await fetchCompetitionFixtures(token);
  const groupFixtures = fixtures.filter((f) => parseProviderGroup(f.group));

  const mismatches: Array<{
    id: string;
    internal: string;
    api: string;
    swapped: boolean;
  }> = [];

  for (const f of groupFixtures) {
    const internalId = await resolveInternalMatchId(
      'football-data.org',
      `cmp-${f.providerId}`,
      f.homeName,
      f.awayName,
      {},
      f.group
    );
    if (!internalId) continue;

    const m = groupMatches.find((x) => x.id === internalId)!;
    const apiHomeId = teamIdFromProviderName(f.homeName);
    const apiAwayId = teamIdFromProviderName(f.awayName);
    if (!apiHomeId || !apiAwayId) continue;

    const direct = m.homeTeamId === apiHomeId && m.awayTeamId === apiAwayId;
    const swapped = m.homeTeamId === apiAwayId && m.awayTeamId === apiHomeId;
    if (!direct && !swapped) {
      const intHome = teams.find((t) => t.id === m.homeTeamId)!.name;
      const intAway = teams.find((t) => t.id === m.awayTeamId)!.name;
      mismatches.push({
        id: internalId,
        internal: `${intHome} vs ${intAway}`,
        api: `${f.homeName} vs ${f.awayName}`,
        swapped: false
      });
    } else if (swapped) {
      const intHome = teams.find((t) => t.id === m.homeTeamId)!.name;
      const intAway = teams.find((t) => t.id === m.awayTeamId)!.name;
      mismatches.push({
        id: internalId,
        internal: `${intHome} vs ${intAway}`,
        api: `${f.homeName} vs ${f.awayName}`,
        swapped: true
      });
    }
  }

  const swappedOnly = mismatches.filter((m) => m.swapped);
  console.log(`Mapped ${groupFixtures.length} group fixtures from API`);
  console.log(`Orientation mismatches: ${mismatches.length} (${swappedOnly.length} swapped)`);
  for (const m of mismatches) {
    console.log(`${m.id}: internal=${m.internal} api=${m.api} swapped=${m.swapped}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
