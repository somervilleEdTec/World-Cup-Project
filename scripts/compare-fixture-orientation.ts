/**
 * Compare internal group and knockout fixture home/away against football-data.org.
 * Usage: npm run compare:orientations
 */
import 'dotenv/config';
import { buildConfirmedKnockoutFixtures } from '../src/lib/knockoutFixtureAvailability.js';
import {
  compareKnockoutOrientation,
  formatKnockoutOrientationLabel
} from '../src/lib/knockoutFixtureOrientations.js';
import { groupMatches, teams } from '../src/data/tournament.js';
import { fetchCompetitionFixtures } from '../src/services/footballDataService.js';
import { getFootballDataToken } from '../src/lib/runtimeConfig.js';
import { initDatabase, closeDatabase } from '../src/server/database/index.js';
import { seedGroupMatchMappings } from '../src/server/services/matchMapping.js';
import { syncFootballData } from '../src/server/services/sync.js';
import { getResultsMap } from '../src/server/services/leaderboard.js';
import {
  parseProviderGroup,
  resolveInternalMatchId,
  teamIdFromProviderName
} from '../src/server/services/matchMapping.js';

type OrientationMismatch = {
  id: string;
  internal: string;
  api: string;
  swapped: boolean;
};

function formatTeams(homeTeamId: string, awayTeamId: string): string {
  const home = teams.find((team) => team.id === homeTeamId)?.name ?? homeTeamId;
  const away = teams.find((team) => team.id === awayTeamId)?.name ?? awayTeamId;
  return `${home} vs ${away}`;
}

async function compareGroupOrientations(
  groupFixtures: Awaited<ReturnType<typeof fetchCompetitionFixtures>>
): Promise<OrientationMismatch[]> {
  const mismatches: OrientationMismatch[] = [];

  for (const fixture of groupFixtures) {
    const internalId = await resolveInternalMatchId(
      'football-data.org',
      `cmp-${fixture.providerId}`,
      fixture.homeName,
      fixture.awayName,
      {},
      fixture.group
    );
    if (!internalId) continue;

    const match = groupMatches.find((entry) => entry.id === internalId)!;
    const apiHomeId = teamIdFromProviderName(fixture.homeName);
    const apiAwayId = teamIdFromProviderName(fixture.awayName);
    if (!apiHomeId || !apiAwayId) continue;

    const direct = match.homeTeamId === apiHomeId && match.awayTeamId === apiAwayId;
    const swapped = match.homeTeamId === apiAwayId && match.awayTeamId === apiHomeId;
    if (!direct && !swapped) {
      mismatches.push({
        id: internalId,
        internal: formatTeams(match.homeTeamId, match.awayTeamId),
        api: `${fixture.homeName} vs ${fixture.awayName}`,
        swapped: false
      });
    } else if (swapped) {
      mismatches.push({
        id: internalId,
        internal: formatTeams(match.homeTeamId, match.awayTeamId),
        api: `${fixture.homeName} vs ${fixture.awayName}`,
        swapped: true
      });
    }
  }

  return mismatches;
}

async function compareKnockoutOrientations(
  apiFixtures: Awaited<ReturnType<typeof fetchCompetitionFixtures>>
): Promise<OrientationMismatch[]> {
  const results = await getResultsMap();
  const confirmed = buildConfirmedKnockoutFixtures(results);
  const koApiFixtures = apiFixtures.filter((fixture) => fixture.stage === 'LAST_32');
  const mismatches: OrientationMismatch[] = [];

  for (const match of confirmed) {
    const apiFixture = koApiFixtures.find((fixture) => {
      const homeId = teamIdFromProviderName(fixture.homeName);
      const awayId = teamIdFromProviderName(fixture.awayName);
      if (!homeId || !awayId) return false;
      return (
        (homeId === match.homeTeamId && awayId === match.awayTeamId) ||
        (homeId === match.awayTeamId && awayId === match.homeTeamId)
      );
    });

    if (!apiFixture?.homeName || !apiFixture.awayName) continue;

    const check = compareKnockoutOrientation(
      match,
      teamIdFromProviderName(apiFixture.homeName),
      teamIdFromProviderName(apiFixture.awayName)
    );

    if (check.status === 'swapped' || check.status === 'mismatch') {
      mismatches.push({
        id: match.id,
        internal: formatKnockoutOrientationLabel(match.homeTeamId, match.awayTeamId),
        api: `${apiFixture.homeName} vs ${apiFixture.awayName}`,
        swapped: check.status === 'swapped'
      });
    } else if (check.status === 'ok') {
      // eslint-disable-next-line no-console
      console.log(`  ${match.id}: OK ${check.internalHomeTeamId} vs ${check.internalAwayTeamId}`);
    }
  }

  return mismatches;
}

async function main() {
  const token = getFootballDataToken();
  if (!token) {
    // eslint-disable-next-line no-console
    console.error('FOOTBALL_DATA_TOKEN required');
    process.exit(1);
  }

  await initDatabase();
  await seedGroupMatchMappings();
  const sync = await syncFootballData(token);
  const fixtures = await fetchCompetitionFixtures(token);
  const groupFixtures = fixtures.filter((fixture) => parseProviderGroup(fixture.group));

  const groupMismatches = await compareGroupOrientations(groupFixtures);
  const swappedGroup = groupMismatches.filter((entry) => entry.swapped);

  // eslint-disable-next-line no-console
  console.log('=== GROUP STAGE ===');
  // eslint-disable-next-line no-console
  console.log(`Mapped ${groupFixtures.length} group fixtures from API`);
  // eslint-disable-next-line no-console
  console.log(
    `Orientation mismatches: ${groupMismatches.length} (${swappedGroup.length} swapped; sync normalizes scores)`
  );
  for (const mismatch of groupMismatches) {
    // eslint-disable-next-line no-console
    console.log(
      `${mismatch.id}: internal=${mismatch.internal} api=${mismatch.api} swapped=${mismatch.swapped}`
    );
  }

  // eslint-disable-next-line no-console
  console.log('\n=== KNOCKOUT (confirmed fixtures vs football-data) ===');
  // eslint-disable-next-line no-console
  console.log(`Results sync: ${JSON.stringify(sync)}`);
  const knockoutMismatches = await compareKnockoutOrientations(fixtures);
  const swappedKnockout = knockoutMismatches.filter((entry) => entry.swapped);
  // eslint-disable-next-line no-console
  console.log(
    `Orientation mismatches: ${knockoutMismatches.length} (${swappedKnockout.length} swapped)`
  );
  for (const mismatch of knockoutMismatches) {
    // eslint-disable-next-line no-console
    console.log(
      `${mismatch.id}: internal=${mismatch.internal} api=${mismatch.api} swapped=${mismatch.swapped}`
    );
  }

  await closeDatabase();

  if (knockoutMismatches.some((entry) => !entry.swapped)) {
    process.exit(1);
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
