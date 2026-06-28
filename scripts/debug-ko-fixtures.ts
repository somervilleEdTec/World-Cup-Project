/**
 * Diagnose confirmed knockout fixtures vs group completion and sync state.
 * Run: SQLITE_PATH=/tmp/ko-debug.db npx tsx scripts/debug-ko-fixtures.ts
 */
import 'dotenv/config';
import { initDatabase, closeDatabase, getDb } from '../src/server/database/index.js';
import { resetDatabase } from '../src/server/database/migrate.js';
import { seedGroupMatchMappings } from '../src/server/services/matchMapping.js';
import { syncFootballData } from '../src/server/services/sync.js';
import { getResultsMap } from '../src/server/services/leaderboard.js';
import {
  buildConfirmedKnockoutFixtures,
  getKnockoutUnlockSummary,
  isGroupCompleteInResults
} from '../src/lib/knockoutFixtureAvailability.js';
import { buildKnockoutMatches, KNOCKOUT_TEMPLATES } from '../src/lib/bracketEngine.js';
import { groupMatches } from '../src/data/tournament.js';
import { picksFromActuals } from '../src/lib/pickUtils.js';
import { fetchLatestResults } from '../src/services/footballDataService.js';
import { getFootballDataToken } from '../src/lib/runtimeConfig.js';

async function main() {
  const token = getFootballDataToken();
  if (!token) {
    // eslint-disable-next-line no-console
    console.error('FOOTBALL_DATA_TOKEN or FOOTBALL_API_KEY is required');
    process.exit(1);
  }

  await initDatabase();
  await resetDatabase(getDb());
  await seedGroupMatchMappings();

  const apiResponse = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': token }
  });
  const apiPayload = (await apiResponse.json()) as {
    matches: Array<{
      id: number;
      status: string;
      group?: string | null;
      utcDate: string;
      homeTeam: { name: string | null; shortName?: string | null };
      awayTeam: { name: string | null; shortName?: string | null };
      score: { fullTime: { home: number | null; away: number | null } };
    }>;
  };
  const groupJApi = apiPayload.matches.filter((m) => (m.group ?? '').toUpperCase().includes('J'));
  // eslint-disable-next-line no-console
  console.log('=== FOOTBALL-DATA GROUP J (all statuses) ===');
  for (const m of groupJApi) {
    // eslint-disable-next-line no-console
    console.log(
      `  ${m.id} ${m.status} ${m.homeTeam.shortName ?? m.homeTeam.name} vs ${m.awayTeam.shortName ?? m.awayTeam.name} FT=${m.score.fullTime.home}-${m.score.fullTime.away} @ ${m.utcDate}`
    );
  }
  const latest = await fetchLatestResults(token);
  // eslint-disable-next-line no-console
  console.log('fetchLatestResults count:', latest.length);

  const sync = await syncFootballData(token);
  const results = await getResultsMap();
  const confirmed = buildConfirmedKnockoutFixtures(results);
  const summary = getKnockoutUnlockSummary(results);
  // eslint-disable-next-line no-console
  console.log('\n=== UNLOCK SUMMARY ===');
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));

  const picks = picksFromActuals(results);
  const allKo = buildKnockoutMatches(picks, results, { useFairPlay: true });

  // eslint-disable-next-line no-console
  console.log('=== SYNC ===');
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(sync));
  // eslint-disable-next-line no-console
  console.log('Total FINISHED results:', Object.keys(results).length);
  // eslint-disable-next-line no-console
  console.log('Group results:', Object.keys(results).filter((k) => k.startsWith('g-')).length);

  // eslint-disable-next-line no-console
  console.log('\n=== GROUP COMPLETION ===');
  for (const g of 'ABCDEFGHIJKL'.split('')) {
    const matches = groupMatches.filter((m) => m.group === g);
    const done = matches.filter((m) => results[m.id]).length;
    const complete = isGroupCompleteInResults(g, results);
    const missing = matches.filter((m) => !results[m.id]).map((m) => m.id);
    // eslint-disable-next-line no-console
    console.log(
      `Group ${g}: ${done}/6 ${complete ? 'COMPLETE' : 'incomplete'}${
        missing.length ? ` (missing: ${missing.join(', ')})` : ''
      }`
    );
  }

  // eslint-disable-next-line no-console
  console.log('\n=== CONFIRMED KO FIXTURES ===');
  // eslint-disable-next-line no-console
  console.log('Count:', confirmed.length);
  for (const m of confirmed) {
    // eslint-disable-next-line no-console
    console.log(`  ${m.id} (${m.stage}): ${m.homeTeamId} vs ${m.awayTeamId}`);
  }

  const r32All = KNOCKOUT_TEMPLATES.filter((t) => t.stage === 'R32').map((t) => t.id);
  const confirmedIds = new Set(confirmed.map((m) => m.id));
  const missingR32 = r32All.filter((id) => !confirmedIds.has(id));

  // eslint-disable-next-line no-console
  console.log('\n=== MISSING R32 FIXTURES (with reason) ===');
  // eslint-disable-next-line no-console
  console.log('Count:', missingR32.length);
  for (const id of missingR32) {
    const template = KNOCKOUT_TEMPLATES.find((t) => t.id === id)!;
    const match = allKo.find((m) => m.id === id)!;
    const home = template.home.kind;
    const away = template.away.kind;
  // eslint-disable-next-line no-console
    console.log(
      `  ${id}: home=${match.homeTeamId} (${home}) away=${match.awayTeamId} (${away})`
    );
  }

  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
