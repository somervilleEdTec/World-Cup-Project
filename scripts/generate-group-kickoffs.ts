/**
 * Fetches group-stage kickoffs from football-data.org and prints a TypeScript map
 * for src/data/groupStageKickoffs.ts. Requires FOOTBALL_DATA_TOKEN.
 *
 * Usage: FOOTBALL_DATA_TOKEN=... npx tsx scripts/generate-group-kickoffs.ts
 */
import 'dotenv/config';
import { groupMatches } from '../src/data/tournament';
import { fetchCompetitionFixtures } from '../src/services/footballDataService';
import {
  parseProviderGroup,
  resolveInternalMatchId,
  teamIdFromProviderName
} from '../src/server/services/matchMapping';

async function main() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    console.error('FOOTBALL_DATA_TOKEN is required');
    process.exit(1);
  }

  const fixtures = await fetchCompetitionFixtures(token);
  const groupFixtures = fixtures.filter((f) => parseProviderGroup(f.group));
  const kickoffs: Record<string, string> = {};
  let mapped = 0;
  let missing = 0;

  for (const fixture of groupFixtures) {
    const internalId = await resolveInternalMatchId(
      'football-data.org',
      `gen-${fixture.providerId}`,
      fixture.homeName,
      fixture.awayName,
      {},
      fixture.group
    );
    if (!internalId) {
      missing += 1;
      console.error(
        `Unmapped: ${fixture.homeName} vs ${fixture.awayName} (${fixture.group}) ${fixture.kickoff}`
      );
      continue;
    }
    kickoffs[internalId] = fixture.kickoff;
    mapped += 1;
  }

  for (const match of groupMatches) {
    if (!kickoffs[match.id]) {
      console.error(`Missing kickoff for internal match ${match.id}`);
    }
  }

  console.error(`Mapped ${mapped}/${groupMatches.length} group fixtures (${missing} skipped).`);
  console.log('export const GROUP_STAGE_KICKOFFS: Record<string, string> = {');
  for (const match of groupMatches) {
    const kickoff = kickoffs[match.id];
    if (kickoff) {
      console.log(`  '${match.id}': '${kickoff}',`);
    }
  }
  console.log('};');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
