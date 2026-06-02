/**
 * Seeds a local KO evaluation database:
 * - 10 users "Test 1" … "Test 10" (password: summer)
 * - Random committed group picks + tournament bonus per user
 * - Official results (manual override) for all group matches + knockout bracket
 *   Scores are random 0–3 per team; no FOOTBALL_DATA_TOKEN required.
 */
import 'dotenv/config';
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

const TEST_USER_COUNT = 10;
const TEST_PASSWORD = 'summer';
const ADMIN_DISPLAY_NAME = 'Test 1';
/** Simulates tournament after first kickoff — locks group + bonus picks in DB. */
const SIMULATED_NOW_ISO = '2026-07-20T00:00:00Z';

function randomInt(maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive + 1));
}

function randomScorePair(): { homeScore: number; awayScore: number; progressingTeamId?: string } {
  const homeScore = randomInt(3);
  const awayScore = randomInt(3);
  return { homeScore, awayScore };
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
    homeScore === awayScore
      ? Math.random() < 0.5
        ? homeTeamId
        : awayTeamId
      : undefined;
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
async function generateOfficialGroupResults(maxAttempts = 80): Promise<Record<string, ActualResult>> {
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
  throw new Error('Could not generate valid third-place mapping after max attempts; re-run the seed script.');
}

async function generateOfficialKnockoutResults(
  groupActuals: Record<string, ActualResult>
): Promise<Record<string, ActualResult>> {
  const actuals = { ...groupActuals };
  let picks = picksFromActuals(actuals);

  for (const template of KNOCKOUT_TEMPLATES) {
    const resolved = buildKnockoutMatches(picks, actuals);
    const match = resolved.find((m) => m.id === template.id);
    if (!match || match.homeTeamId === 'tbd' || match.awayTeamId === 'tbd') continue;
    if (actuals[match.id]) continue;

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

async function seedTestUsers(): Promise<Map<string, string>> {
  const userIds = new Map<string, string>();

  for (let i = 1; i <= TEST_USER_COUNT; i += 1) {
    const displayName = `Test ${i}`;
    const user = await register(displayName, TEST_PASSWORD, process.env.JOIN_PASSWORD ?? 'MadSlags1');
    userIds.set(displayName, user.id);
    // eslint-disable-next-line no-console
    console.log(`Registered ${displayName}`);
  }

  const db = getDb();
  const adminId = userIds.get(ADMIN_DISPLAY_NAME);
  if (adminId) {
    await db.run(`UPDATE users SET is_admin = 1 WHERE id = ?`, [adminId]);
    // eslint-disable-next-line no-console
    console.log(`${ADMIN_DISPLAY_NAME} promoted to admin.`);
  }

  return userIds;
}

async function seedUserPredictions(userId: string, displayName: string): Promise<void> {
  for (const match of groupMatches) {
    await saveDraftPick(userId, randomGroupPick(match.id));
  }
  await setBonusDraft(userId, randomBonusPick());
  // eslint-disable-next-line no-console
  console.log(`  Picks saved for ${displayName} (72 group + tournament bonus).`);
}

async function main() {
  const skipPurge = process.argv.includes('--no-purge');

  await initDatabase();
  if (!skipPurge) {
    await resetDatabase(getDb());
    // eslint-disable-next-line no-console
    console.log('Database purged and schema recreated.');
  }

  const userIds = await seedTestUsers();

  for (const [displayName, userId] of userIds) {
    await seedUserPredictions(userId, displayName);
  }

  // eslint-disable-next-line no-console
  console.log('\nGenerating official results (manual override, no API token)…');
  const fullBracket = process.argv.includes('--full-bracket');
  const groupActuals = await generateOfficialGroupResults();
  const allActuals = fullBracket
    ? await generateOfficialKnockoutResults(groupActuals)
    : groupActuals;

  await runAutoLocks(SIMULATED_NOW_ISO);
  // eslint-disable-next-line no-console
  console.log(`Applied tournament locks (simulated date ${SIMULATED_NOW_ISO}).`);

  const confirmed = buildConfirmedKnockoutFixtures(allActuals);
  const leaderboard = await computeLeaderboard();

  // eslint-disable-next-line no-console
  console.log('\n--- KO environment summary ---');
  // eslint-disable-next-line no-console
  console.log(`Users: ${TEST_USER_COUNT} (password: ${TEST_PASSWORD})`);
  // eslint-disable-next-line no-console
  console.log(`Admin login: ${ADMIN_DISPLAY_NAME} / ${TEST_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(
    `Official results: ${Object.keys(allActuals).length} matches (${fullBracket ? 'full bracket' : 'group stage only'})`
  );
  // eslint-disable-next-line no-console
  console.log(`Confirmed KO fixtures for picks UI: ${confirmed.length}`);
  // eslint-disable-next-line no-console
  console.log('Leaderboard (points):');
  leaderboard
    .sort((a, b) => b.points - a.points)
    .forEach((row, index) => {
      // eslint-disable-next-line no-console
      console.log(`  ${index + 1}. ${row.name}: ${row.points} pts`);
    });

  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
