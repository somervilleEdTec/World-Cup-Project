/**
 * Debug-branch local seed — no football-data.org.
 * Default: Test1–Test20, password guest, no predictions, no results (see docs/DEBUG.md).
 * Optional: --with-predictions, --random-results, or scenario flags.
 */
import 'dotenv/config';
import {
  DEBUG_ADMIN_INDEX,
  DEBUG_TEST_USER_COUNT,
  DEBUG_USER_PASSWORD,
  DEBUG_USER_PREFIX,
  debugDisplayName
} from './lib/debugDefaults.js';
import { assertDevSeedAllowed } from './lib/devSeedGuard.js';
import { groupMatches, teams } from '../src/data/tournament.js';
import { KNOCKOUT_TEMPLATES, buildKnockoutMatches } from '../src/lib/bracketEngine.js';
import { buildConfirmedKnockoutFixtures } from '../src/lib/knockoutFixtureAvailability.js';
import { picksFromActuals } from '../src/lib/pickUtils.js';
import { closeDatabase, getDb, initDatabase } from '../src/server/database/index.js';
import { resetDatabase } from '../src/server/database/migrate.js';
import { register } from '../src/server/services/auth.js';
import { runAutoLocks, saveDraftPick, setBonusDraft } from '../src/server/services/predictions.js';
import { computeLeaderboard } from '../src/server/services/leaderboard.js';
import type { ActualResult, Pick, TournamentBonusPick } from '../src/types.js';

const DEFAULT_TEST_PASSWORD = DEBUG_USER_PASSWORD;
const DEFAULT_USER_PREFIX = DEBUG_USER_PREFIX;
const DEFAULT_ADMIN_INDEX = DEBUG_ADMIN_INDEX;
const DEFAULT_MAX_GOALS = 3;
/** Simulates tournament after first kickoff — locks group + bonus picks in DB. */
const SIMULATED_NOW_ISO = '2026-07-20T00:00:00Z';
/** After third-place, before final kickoff — one final prediction left per user. */
const SIMULATED_BEFORE_FINAL_ISO = '2026-07-19T12:00:00Z';
/** When seeding KO predictions, must be before any KO fixture kickoff. */
const SEED_KO_PICKS_NOW_ISO = '2026-06-27T00:00:00Z';
const FINAL_MATCH_ID = 'final';

function parseArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const prefixed = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (prefixed) return prefixed.slice(flag.length + 1);
  return undefined;
}

function parseMaxGoals(): number {
  const raw = parseArgValue('--max-goals');
  if (!raw) return DEFAULT_MAX_GOALS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error('--max-goals must be a non-negative integer');
  return n;
}

let maxGoalsPerTeam = DEFAULT_MAX_GOALS;

function randomInt(maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive + 1));
}

function randomScorePair(): { homeScore: number; awayScore: number; progressingTeamId?: string } {
  const homeScore = randomInt(maxGoalsPerTeam);
  const awayScore = randomInt(maxGoalsPerTeam);
  return { homeScore, awayScore };
}

function displayNameForIndex(userPrefix: string, index: number): string {
  return debugDisplayName(index, userPrefix.replace(/\s+$/, ''));
}

function parseUserCount(): number {
  const raw = parseArgValue('--user-count');
  if (!raw) return DEBUG_TEST_USER_COUNT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error('--user-count must be a positive integer');
  }
  return n;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomBonusPick(): TournamentBonusPick {
  const picked = shuffle(teams).slice(0, 4);
  return {
    winnerTeamId: picked[0].id,
    runnerUpTeamId: picked[1].id,
    thirdTeamId: picked[2].id,
    fourthTeamId: picked[3].id
  };
}

function randomGroupPick(matchId: string): Pick {
  const { homeScore, awayScore } = randomScorePair();
  return { matchId, homeScore, awayScore };
}

async function insertResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  homeTeamId: string,
  awayTeamId: string
): Promise<ActualResult> {
  const progressingTeamId =
    homeScore === awayScore ? (Math.random() < 0.5 ? homeTeamId : awayTeamId) : undefined;
  const now = new Date().toISOString();
  const db = getDb();
  await db.run(
    `INSERT INTO results (match_id, home_score, away_score, progressing_team_id, status, source, updated_at)
     VALUES (?, ?, ?, ?, 'FINISHED', 'ko-environment-seed', ?)
     ON CONFLICT(match_id) DO UPDATE SET
       home_score=excluded.home_score,
       away_score=excluded.away_score,
       progressing_team_id=excluded.progressing_team_id,
       status=excluded.status,
       source=excluded.source,
       updated_at=excluded.updated_at`,
    [matchId, homeScore, awayScore, progressingTeamId ?? null, now]
  );
  return {
    matchId,
    homeScore,
    awayScore,
    progressingTeamId
  };
}

/** Retry until third-place mapping resolves and all 16 R32 fixtures have both teams. */
async function generateOfficialGroupResults(
  maxAttempts = 80
): Promise<Record<string, ActualResult>> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const actuals: Record<string, ActualResult> = {};
    for (const match of groupMatches) {
      const { homeScore, awayScore } = randomScorePair();
      actuals[match.id] = await insertResult(
        match.id,
        homeScore,
        awayScore,
        match.homeTeamId,
        match.awayTeamId
      );
    }
    const confirmed = buildConfirmedKnockoutFixtures(actuals);
    const r32 = confirmed.filter((m) => m.stage === 'R32');
    if (r32.length === 16) {
      // eslint-disable-next-line no-console
      console.log(`Official group results OK (attempt ${attempt}): 16 R32 fixtures confirmed.`);
      return actuals;
    }
  }
  throw new Error(
    'Could not generate valid third-place mapping after max attempts; re-run the seed script.'
  );
}

async function generateOfficialKnockoutResults(
  groupActuals: Record<string, ActualResult>,
  options?: { excludeResultMatchIds?: string[] }
): Promise<Record<string, ActualResult>> {
  return generateOfficialKnockoutResultsWithPredictions(groupActuals, undefined, options);
}

/** Insert KO results fixture-by-fixture; optional per-user picks before each result (avoids pick lock). */
async function generateOfficialKnockoutResultsWithPredictions(
  groupActuals: Record<string, ActualResult>,
  userIds?: Map<string, string>,
  options?: {
    excludeResultMatchIds?: string[];
    excludePredictionMatchIds?: string[];
    pickNowIso?: string;
  }
): Promise<Record<string, ActualResult>> {
  const excludeResults = new Set(options?.excludeResultMatchIds ?? []);
  const excludePredictions = new Set(options?.excludePredictionMatchIds ?? []);
  const pickNowIso = options?.pickNowIso ?? SEED_KO_PICKS_NOW_ISO;
  const actuals = { ...groupActuals };
  let picks = picksFromActuals(actuals);

  for (const template of KNOCKOUT_TEMPLATES) {
    const resolved = buildKnockoutMatches(picks, actuals);
    const match = resolved.find((m) => m.id === template.id);
    if (!match || match.homeTeamId === 'tbd' || match.awayTeamId === 'tbd') continue;
    if (actuals[match.id]) continue;

    if (userIds && !excludePredictions.has(match.id)) {
      for (const [, userId] of userIds) {
        await saveDraftPick(
          userId,
          randomKnockoutPick(match.id, match.homeTeamId, match.awayTeamId),
          pickNowIso
        );
      }
    }

    if (excludeResults.has(match.id)) continue;

    const { homeScore, awayScore } = randomScorePair();
    actuals[match.id] = await insertResult(
      match.id,
      homeScore,
      awayScore,
      match.homeTeamId,
      match.awayTeamId
    );
    picks = { ...picks, ...picksFromActuals({ [match.id]: actuals[match.id] }) };
  }

  return actuals;
}

async function seedTestUsers(options: {
  userPrefix: string;
  password: string;
  adminIndex: number;
}): Promise<Map<string, string>> {
  const userIds = new Map<string, string>();

  const testUserCount = parseUserCount();
  for (let i = 1; i <= testUserCount; i += 1) {
    const displayName = displayNameForIndex(options.userPrefix, i);
    const user = await register(
      displayName,
      options.password,
      process.env.JOIN_PASSWORD ?? 'MadSlags1'
    );
    userIds.set(displayName, user.id);
    // eslint-disable-next-line no-console
    console.log(`Registered ${displayName}`);
  }

  const db = getDb();
  const adminDisplayName = displayNameForIndex(options.userPrefix, options.adminIndex);
  const adminId = userIds.get(adminDisplayName);
  if (adminId) {
    await db.run(`UPDATE users SET is_admin = 1 WHERE id = ?`, [adminId]);
    // eslint-disable-next-line no-console
    console.log(`${adminDisplayName} promoted to admin.`);
  }

  return userIds;
}

function randomKnockoutPick(matchId: string, homeTeamId: string, awayTeamId: string): Pick {
  const { homeScore, awayScore } = randomScorePair();
  const progressingTeamId =
    homeScore === awayScore ? (Math.random() < 0.5 ? homeTeamId : awayTeamId) : undefined;
  return { matchId, homeScore, awayScore, progressingTeamId };
}

async function seedUserPredictions(userId: string, displayName: string): Promise<void> {
  for (const match of groupMatches) {
    await saveDraftPick(userId, randomGroupPick(match.id));
  }
  await setBonusDraft(userId, randomBonusPick());
  // eslint-disable-next-line no-console
  console.log(`  Picks saved for ${displayName} (72 group + tournament bonus).`);
}

async function seedUserKnockoutPredictions(
  userId: string,
  displayName: string,
  actuals: Record<string, ActualResult>,
  excludeMatchIds: string[],
  pickNowIso: string
): Promise<number> {
  const excluded = new Set(excludeMatchIds);
  const fixtures = buildConfirmedKnockoutFixtures(actuals).filter((m) => !excluded.has(m.id));
  for (const match of fixtures) {
    await saveDraftPick(
      userId,
      randomKnockoutPick(match.id, match.homeTeamId, match.awayTeamId),
      pickNowIso
    );
  }
  // eslint-disable-next-line no-console
  console.log(
    `  KO predictions for ${displayName}: ${fixtures.length} saved (excluded: ${excludeMatchIds.join(', ') || 'none'}).`
  );
  return fixtures.length;
}

async function main() {
  assertDevSeedAllowed('npm run seed:ko-environment / seed:before-final / seed:complete-teams');

  maxGoalsPerTeam = parseMaxGoals();
  const testPassword = parseArgValue('--password') ?? DEFAULT_TEST_PASSWORD;
  const userPrefix = parseArgValue('--user-prefix') ?? DEFAULT_USER_PREFIX;
  const adminIndex = Number.parseInt(
    parseArgValue('--admin-index') ?? String(DEFAULT_ADMIN_INDEX),
    10
  );

  const skipPurge = process.argv.includes('--no-purge');
  const beforeFinal = process.argv.includes('--before-final');
  const fullBracket = process.argv.includes('--full-bracket');
  const completeTournament = process.argv.includes('--complete-tournament');
  const scenarioFlags = [beforeFinal, fullBracket, completeTournament].filter(Boolean);
  if (scenarioFlags.length > 1) {
    throw new Error('Use only one of --before-final, --full-bracket, or --complete-tournament.');
  }

  const withPredictions =
    process.argv.includes('--with-predictions') || scenarioFlags.length > 0;
  const withResults =
    process.argv.includes('--random-results') || scenarioFlags.length > 0;
  const seedPredictions = withPredictions;
  const seedResults = withResults;

  await initDatabase();
  if (!skipPurge) {
    await resetDatabase(getDb());
    // eslint-disable-next-line no-console
    console.log('Database purged and schema recreated.');
  }

  const userIds = await seedTestUsers({
    userPrefix,
    password: testPassword,
    adminIndex: Number.isFinite(adminIndex) ? adminIndex : DEFAULT_ADMIN_INDEX
  });
  const adminDisplayName = displayNameForIndex(userPrefix, adminIndex);

  if (seedPredictions) {
    for (const [displayName, userId] of userIds) {
      await seedUserPredictions(userId, displayName);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('\nNo predictions seeded (default Debug state).');
  }

  let groupActuals: Record<string, ActualResult> = {};
  if (!seedResults) {
    // eslint-disable-next-line no-console
    console.log('No official results seeded (default Debug state).');
  } else {
    // eslint-disable-next-line no-console
    console.log('\nGenerating random official results (local seed, no API token)…');
    groupActuals = await generateOfficialGroupResults();
  }
  let allActuals: Record<string, ActualResult>;
  if (beforeFinal) {
    allActuals = await generateOfficialKnockoutResults(groupActuals, {
      excludeResultMatchIds: [FINAL_MATCH_ID]
    });
    // eslint-disable-next-line no-console
    console.log(
      `Official KO results through third-place; final (${FINAL_MATCH_ID}) has teams but no score.`
    );
  } else if (beforeFinal) {
    // eslint-disable-next-line no-console
    console.log(
      '\nSeeding KO predictions then official results (through third-place; final teams only)…'
    );
    allActuals = await generateOfficialKnockoutResultsWithPredictions(groupActuals, userIds, {
      excludeResultMatchIds: [FINAL_MATCH_ID],
      excludePredictionMatchIds: [FINAL_MATCH_ID]
    });
  } else if (fullBracket) {
    allActuals = await generateOfficialKnockoutResults(groupActuals);
  } else if (completeTournament) {
    // eslint-disable-next-line no-console
    console.log('\nSeeding KO predictions then official results (full tournament, no API token)…');
    allActuals = await generateOfficialKnockoutResultsWithPredictions(groupActuals, userIds);
  } else {
    allActuals = groupActuals;
  }

  if (seedResults || seedPredictions) {
    const lockNowIso = beforeFinal ? SIMULATED_BEFORE_FINAL_ISO : SIMULATED_NOW_ISO;
    await runAutoLocks(lockNowIso);
    // eslint-disable-next-line no-console
    console.log(`Applied tournament locks (simulated date ${lockNowIso}).`);
  }

  const confirmed = buildConfirmedKnockoutFixtures(allActuals);
  const finalFixture = confirmed.find((m) => m.id === FINAL_MATCH_ID);
  const leaderboard = seedResults || seedPredictions ? await computeLeaderboard() : [];

  const testUserCount = parseUserCount();
  const scenarioLabel =
    !seedPredictions && !seedResults
      ? 'users only (no predictions, no results)'
      : !seedResults
        ? 'predictions only (no official results)'
        : beforeFinal
      ? 'before-final (one prediction left per user)'
      : completeTournament
        ? 'complete tournament (all results + all predictions)'
        : fullBracket
          ? 'full bracket'
          : 'group stage only';

  // eslint-disable-next-line no-console
  console.log('\n--- KO environment summary ---');
  // eslint-disable-next-line no-console
  console.log(`Scenario: ${scenarioLabel}`);
  // eslint-disable-next-line no-console
  console.log(
    `Users: ${testUserCount} × ${displayNameForIndex(userPrefix, 1)}… (password: ${testPassword}, max goals per team: ${maxGoalsPerTeam})`
  );
  // eslint-disable-next-line no-console
  console.log(`Admin login: ${adminDisplayName} / ${testPassword}`);
  // eslint-disable-next-line no-console
  console.log(`Official results: ${Object.keys(allActuals).length} matches`);
  // eslint-disable-next-line no-console
  console.log(`Predictions seeded: ${seedPredictions ? 'yes' : 'no'}`);
  // eslint-disable-next-line no-console
  console.log(`Confirmed KO fixtures for picks UI: ${confirmed.length}`);
  if (beforeFinal && finalFixture) {
    // eslint-disable-next-line no-console
    console.log(
      `Final fixture: ${finalFixture.homeTeamId} vs ${finalFixture.awayTeamId} — no official result; no user prediction yet.`
    );
  }
  if (leaderboard.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Leaderboard (points):');
    leaderboard
      .sort((a, b) => b.points - a.points)
      .forEach((row, index) => {
        // eslint-disable-next-line no-console
        console.log(`  ${index + 1}. ${row.name}: ${row.points} pts`);
      });
  }

  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
