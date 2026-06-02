import 'dotenv/config';
import { closeDatabase, initDatabase } from '../src/server/database/index.js';
import { fetchCompetitionFixtures, PROVIDER } from '../src/services/footballDataService.js';
import { resolveInternalMatchId } from '../src/server/services/matchMapping.js';
import { upsertMatchKickoff } from '../src/server/kickoffs.js';
import { seedGroupMatchMappings } from '../src/server/services/matchMapping.js';

async function main() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    // eslint-disable-next-line no-console
    console.error('FOOTBALL_DATA_TOKEN is required');
    process.exit(1);
  }

  await initDatabase();
  await seedGroupMatchMappings();

  const fixtures = await fetchCompetitionFixtures(token);
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

  // eslint-disable-next-line no-console
  console.log(`Seed complete: ${mapped} kickoffs updated, ${skipped} fixtures skipped (unmapped teams).`);
  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
