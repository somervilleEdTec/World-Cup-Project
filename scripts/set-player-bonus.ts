/**
 * Set tournament bonus (overall results) picks for a player — organiser override.
 * Writes directly to prediction_meta.bonus_committed (bypasses API lock checks).
 *
 * Usage:
 *   npx tsx scripts/set-player-bonus.ts "Snoop" england argentina france spain
 *   npx tsx scripts/set-player-bonus.ts --id <uuid> england argentina france spain
 */
import 'dotenv/config';
import { teams } from '../src/data/tournament.js';
import { closeDatabase, getDb, initDatabase } from '../src/server/database/index.js';
import { validateBonusPick } from '../src/lib/tournamentLogic.js';
import type { TournamentBonusPick } from '../src/types.js';

function resolveTeamId(token: string): string {
  const normalized = token.trim().toLowerCase();
  const byId = teams.find((team) => team.id === normalized);
  if (byId) return byId.id;

  const byName = teams.find((team) => team.name.toLowerCase() === normalized);
  if (byName) return byName.id;

  const slug = normalized.replace(/[^a-z0-9]+/g, '-');
  const bySlug = teams.find((team) => team.id === slug);
  if (bySlug) return bySlug.id;

  throw new Error(`Unknown team "${token}". Use a team slug (e.g. england) or full name.`);
}

async function findPlayer(
  db: ReturnType<typeof getDb>,
  args: string[]
): Promise<{ id: string; display_name: string; is_admin: number }> {
  if (args[0] === '--id') {
    const userId = args[1];
    if (!userId) throw new Error('--id requires a user id');
    const row = await db.get<{ id: string; display_name: string; is_admin: number }>(
      `SELECT id, display_name, is_admin FROM users WHERE id = ?`,
      [userId]
    );
    if (!row) throw new Error(`No user found with id ${userId}`);
    return row;
  }

  const name = args.join(' ').trim();
  const rows = await db.all<{ id: string; display_name: string; is_admin: number }>(
    `SELECT id, display_name, is_admin FROM users WHERE LOWER(display_name) = LOWER(?)`,
    [name]
  );
  if (rows.length === 0) throw new Error(`No user found with display name "${name}"`);
  if (rows.length > 1) {
    throw new Error(
      `Multiple users match "${name}" — use --id:\n${rows.map((r) => `  ${r.id}  ${r.display_name}`).join('\n')}`
    );
  }
  return rows[0]!;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 5) {
    // eslint-disable-next-line no-console
    console.error(
      'Usage: npx tsx scripts/set-player-bonus.ts "<display name>" <winner> <runner-up> <third> <fourth>'
    );
    // eslint-disable-next-line no-console
    console.error(
      '       npx tsx scripts/set-player-bonus.ts --id <uuid> <winner> <runner-up> <third> <fourth>'
    );
    process.exit(1);
  }

  let playerArgs: string[];
  let teamTokens: string[];
  if (args[0] === '--id') {
    playerArgs = args.slice(0, 2);
    teamTokens = args.slice(2, 6);
  } else {
    teamTokens = args.slice(-4);
    playerArgs = args.slice(0, -4);
  }

  if (teamTokens.length !== 4 || teamTokens.some((t) => !t)) {
    // eslint-disable-next-line no-console
    console.error('Provide exactly four team ids/names: winner runner-up third fourth');
    process.exit(1);
  }

  const bonus: TournamentBonusPick = {
    winnerTeamId: resolveTeamId(teamTokens[0]!),
    runnerUpTeamId: resolveTeamId(teamTokens[1]!),
    thirdTeamId: resolveTeamId(teamTokens[2]!),
    fourthTeamId: resolveTeamId(teamTokens[3]!)
  };

  const bonusErrors = validateBonusPick(bonus);
  if (bonusErrors.length) {
    throw new Error(bonusErrors[0]);
  }

  await initDatabase({ skipMigrations: true });
  const db = getDb();
  const player = await findPlayer(db, playerArgs);

  if (player.is_admin === 1) {
    throw new Error(`Refusing to set bonus picks for admin account "${player.display_name}".`);
  }

  const meta = await db.get<{ user_id: string }>(
    `SELECT user_id FROM prediction_meta WHERE user_id = ?`,
    [player.id]
  );
  const nowIso = new Date().toISOString();
  const bonusJson = JSON.stringify(bonus);

  if (!meta) {
    await db.run(
      `INSERT INTO prediction_meta (user_id, bonus_committed, committed_at) VALUES (?, ?, ?)`,
      [player.id, bonusJson, nowIso]
    );
  } else {
    await db.run(
      `UPDATE prediction_meta SET bonus_committed = ?, bonus_draft = NULL, committed_at = ? WHERE user_id = ?`,
      [bonusJson, nowIso, player.id]
    );
  }

  const label = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  // eslint-disable-next-line no-console
  console.log(`Set tournament results for "${player.display_name}" (${player.id}):`);
  // eslint-disable-next-line no-console
  console.log(`  1. ${label(bonus.winnerTeamId)}`);
  // eslint-disable-next-line no-console
  console.log(`  2. ${label(bonus.runnerUpTeamId)}`);
  // eslint-disable-next-line no-console
  console.log(`  3. ${label(bonus.thirdTeamId)}`);
  // eslint-disable-next-line no-console
  console.log(`  4. ${label(bonus.fourthTeamId)}`);

  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
