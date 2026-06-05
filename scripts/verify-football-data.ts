/**
 * Verify FOOTBALL_DATA_TOKEN, mapping, kickoff cross-check vs FIFA schedule,
 * and optionally import kickoffs/results into the local DB.
 *
 * Usage:
 *   FOOTBALL_DATA_TOKEN=your_token npm run verify:football-data
 *   FOOTBALL_DATA_TOKEN=your_token npm run verify:football-data -- --import
 *
 * Safe on production: default is read-only. Use --import only on a test DB / Debug branch.
 */
import 'dotenv/config';
import { closeDatabase, initDatabase } from '../src/server/database/index.js';
import { buildMappingDiagnostics } from '../src/server/services/mappingDiagnostics.js';
import { seedGroupMatchMappings } from '../src/server/services/matchMapping.js';
import { syncKickoffsFromFootballData } from '../src/server/services/fixtureSync.js';
import { syncFootballData } from '../src/server/services/sync.js';
import { getDb } from '../src/server/database/index.js';
import {
  crossCheckKickoffs,
  FIFA_FIXTURES_URL,
  listFinishedMatchesForCrossCheck,
  verifyFootballDataToken
} from '../src/lib/footballDataVerification.js';
import { fetchCompetitionFixtures } from '../src/services/footballDataService.js';

const importMode = process.argv.includes('--import');

function statusCounts(fixtures: { status: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of fixtures) {
    counts[f.status] = (counts[f.status] ?? 0) + 1;
  }
  return counts;
}

async function main() {
  const token = process.env.FOOTBALL_DATA_TOKEN?.trim();
  if (!token) {
    console.error('FOOTBALL_DATA_TOKEN is required in .env or environment.');
    console.error('Get a free token at https://www.football-data.org/client/register');
    process.exit(1);
  }

  console.log('=== football-data.org token check ===\n');
  const tokenCheck = await verifyFootballDataToken(token);
  console.log(`HTTP ${tokenCheck.httpStatus}: ${tokenCheck.message}`);
  if (!tokenCheck.ok) {
    console.error('\nToken is NOT valid. Common fixes:');
    console.error('- Copy the token exactly from football-data.org (no spaces)');
    console.error('- Ensure the token is in server .env as FOOTBALL_DATA_TOKEN=...');
    console.error('- Free tier: confirm your account email if newly registered');
    process.exit(1);
  }

  if (tokenCheck.competition) {
    console.log(`Competition: ${tokenCheck.competition.name} (${tokenCheck.competition.code})`);
    if (tokenCheck.competition.currentSeason) {
      const s = tokenCheck.competition.currentSeason;
      console.log(`Season window: ${s.startDate ?? '?'} → ${s.endDate ?? '?'}`);
    }
  }
  if (tokenCheck.rateLimit?.available || tokenCheck.rateLimit?.limit) {
    console.log(
      `API quota: ${tokenCheck.rateLimit.available ?? '?'} requests remaining (limit ${tokenCheck.rateLimit.limit ?? '?'})`
    );
  }

  console.log('\n=== fixture status (World Cup) ===\n');
  const fixtures = await fetchCompetitionFixtures(token);
  const counts = statusCounts(fixtures);
  for (const [status, n] of Object.entries(counts).sort()) {
    console.log(`  ${status}: ${n}`);
  }
  console.log(`  TOTAL: ${fixtures.length}`);

  const finished = await listFinishedMatchesForCrossCheck(token);
  console.log(`\nFinished matches with FT scores: ${finished.length}`);
  if (finished.length === 0) {
    console.log(
      '  (None yet — tournament starts 11 June 2026. Results sync cannot be end-to-end tested until games finish.)'
    );
    console.log(`  Cross-check future results at: ${FIFA_FIXTURES_URL}`);
  } else {
    console.log('\n=== finished matches (cross-ref FIFA) ===\n');
    for (const row of finished.slice(0, 20)) {
      console.log(
        `  ${row.homeName} ${row.homeScore}-${row.awayScore} ${row.awayName}  [provider ${row.providerId}]  mappable=${row.mappable}`
      );
      console.log(`    Verify: ${row.fifaReference}`);
    }
    if (finished.length > 20) console.log(`  ... and ${finished.length - 20} more`);
  }

  console.log('\n=== group kickoff cross-check (API vs FIFA static schedule) ===\n');
  await initDatabase();
  await seedGroupMatchMappings();

  const kickoffCheck = await crossCheckKickoffs(token);
  console.log(`  Group fixtures from API: ${kickoffCheck.rows.length}`);
  console.log(`  Mapped to internal IDs: ${kickoffCheck.mappedGroup}/72`);
  console.log(`  Kickoffs matching FIFA static: ${kickoffCheck.kickoffMatchesFifa}`);
  console.log(`  Kickoff mismatches: ${kickoffCheck.kickoffMismatches}`);

  const mismatches = kickoffCheck.rows.filter((r) => r.fifaKickoff && !r.kickoffMatch).slice(0, 8);
  if (mismatches.length > 0) {
    console.log('\n  Sample kickoff mismatches (API vs FIFA):');
    for (const row of mismatches) {
      console.log(
        `    ${row.internalId} ${row.homeName} vs ${row.awayName}: API ${row.apiKickoff}  FIFA ${row.fifaKickoff}`
      );
    }
  }

  console.log('\n=== full mapping diagnostics ===\n');
  const report = await buildMappingDiagnostics(token);
  console.log(
    `  Group mapped: ${report.summary.groupStageMapped}/${report.summary.groupStageTotal}`
  );
  console.log(
    `  Knockout mapped: ${report.summary.knockoutMapped}/${report.summary.knockoutTotal}`
  );
  console.log(`  Skip reasons: ${JSON.stringify(report.skipReasons)}`);
  if (report.unmappedTeamNames.length > 0) {
    console.log(`  Unmapped team names: ${JSON.stringify(report.unmappedTeamNames.slice(0, 5))}`);
  }

  if (importMode) {
    console.log('\n=== importing kickoffs + finished results into DB ===\n');
    const kickoffs = await syncKickoffsFromFootballData(token);
    const results = await syncFootballData(token);
    console.log(
      `  Kickoffs: ${kickoffs.mapped} mapped, ${kickoffs.skipped} skipped (${kickoffs.total} from API)`
    );
    console.log(`  Results: ${results.updated} updated, ${results.skipped} skipped`);

    const db = getDb();
    const stored = await db.all<{ match_id: string; home_score: number; away_score: number }>(
      `SELECT match_id, home_score, away_score FROM results WHERE status = 'FINISHED' ORDER BY updated_at DESC LIMIT 10`
    );
    if (stored.length === 0) {
      console.log('  No results rows in DB yet (expected before tournament).');
    } else {
      console.log('  Latest results in DB:');
      for (const row of stored) {
        console.log(`    ${row.match_id}: ${row.home_score}-${row.away_score}`);
      }
    }
  } else {
    console.log('\n  (Read-only run — pass --import to write kickoffs/results to this DB.)');
  }

  console.log('\n=== pass criteria ===');
  const pass =
    tokenCheck.ok &&
    kickoffCheck.mappedGroup >= 70 &&
    report.summary.groupStageMapped >= 70;
  console.log(
    pass
      ? '  PASS: Token valid and group mapping looks healthy (≥70/72).'
      : '  REVIEW: Token OK but mapping may need alias fixes — see unmapped names above.'
  );
  console.log(`  FIFA schedule reference: ${FIFA_FIXTURES_URL}`);

  await closeDatabase();
  process.exit(pass ? 0 : 2);
}

main().catch(async (error) => {
  console.error(error);
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
