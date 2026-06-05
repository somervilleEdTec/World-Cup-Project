/**
 * Remove a non-admin player account and related data.
 *
 * Usage:
 *   npx tsx scripts/remove-player.ts "Admin Tomsom"
 *   npx tsx scripts/remove-player.ts --id <uuid>
 *
 * Refuses to delete admin accounts (is_admin = 1).
 */
import 'dotenv/config';
import { closeDatabase, getDb, initDatabase } from '../src/server/database/index.js';
import { BOOTSTRAP_ADMIN_USERNAME } from '../src/server/services/auth.js';

async function removePlayerById(userId: string, displayName: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.run(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
    await tx.run(`DELETE FROM predictions WHERE user_id = ?`, [userId]);
    await tx.run(`DELETE FROM prediction_meta WHERE user_id = ?`, [userId]);
    await tx.run(`DELETE FROM users WHERE id = ?`, [userId]);
  });
  // eslint-disable-next-line no-console
  console.log(`Removed player "${displayName}" (${userId})`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    // eslint-disable-next-line no-console
    console.error('Usage: npx tsx scripts/remove-player.ts "<display name>"');
    // eslint-disable-next-line no-console
    console.error('       npx tsx scripts/remove-player.ts --id <user-id>');
    process.exit(1);
  }

  await initDatabase({ skipMigrations: true });
  const db = getDb();

  let rows: Array<{ id: string; display_name: string; is_admin: number }>;
  if (args[0] === '--id') {
    const userId = args[1];
    if (!userId) {
      // eslint-disable-next-line no-console
      console.error('--id requires a user id');
      process.exit(1);
    }
    const row = await db.get<{ id: string; display_name: string; is_admin: number }>(
      `SELECT id, display_name, is_admin FROM users WHERE id = ?`,
      [userId]
    );
    if (!row) {
      // eslint-disable-next-line no-console
      console.error(`No user found with id ${userId}`);
      process.exit(1);
    }
    rows = [row];
  } else {
    const name = args.join(' ').trim();
    rows = await db.all<{ id: string; display_name: string; is_admin: number }>(
      `SELECT id, display_name, is_admin FROM users WHERE LOWER(display_name) = LOWER(?)`,
      [name]
    );
    if (rows.length === 0) {
      // eslint-disable-next-line no-console
      console.error(`No user found with display name "${name}"`);
      process.exit(1);
    }
  }

  const admins = rows.filter((row) => row.is_admin === 1);
  const players = rows.filter((row) => row.is_admin !== 1);

  if (players.length === 0) {
    // eslint-disable-next-line no-console
    console.error(
      `Refusing to remove admin account(s). Bootstrap admin is "${BOOTSTRAP_ADMIN_USERNAME}".`
    );
    process.exit(1);
  }

  if (players.length > 1) {
    // eslint-disable-next-line no-console
    console.error('Multiple non-admin matches — use --id:');
    for (const row of players) {
      // eslint-disable-next-line no-console
      console.error(`  ${row.id}  ${row.display_name}`);
    }
    process.exit(1);
  }

  const target = players[0]!;
  if (admins.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `Keeping admin account "${admins[0]!.display_name}" (${admins[0]!.id}); removing player only.`
    );
  }

  await removePlayerById(target.id, target.display_name);
  await closeDatabase();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
