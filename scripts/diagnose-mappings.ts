import 'dotenv/config';
import { closeDatabase, initDatabase } from '../src/server/database/index.js';
import { buildMappingDiagnostics } from '../src/server/services/mappingDiagnostics.js';
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

  const report = await buildMappingDiagnostics(token);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
