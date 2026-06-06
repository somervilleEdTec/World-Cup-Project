import crypto from 'node:crypto';
import { getDb } from '../database';

/** Player sessions stay valid 90 days on the same device (tournament length). */
const SESSION_TTL_HOURS = 24 * 90;

/** Player-chosen passwords (after first login); no complexity rules. */
export const PLAYER_PASSWORD_MAX_LENGTH = 30;

export const BOOTSTRAP_ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim() || 'AdminTomsom';
export const BOOTSTRAP_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || 'DickTits9';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const check = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

export interface AuthUser {
  id: string;
  displayName: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

function normalizeName(name: string): string {
  return name.trim();
}

/** Collapse spaces for reserved-name checks (blocks "Admin Tomsom" vs AdminTomsom). */
function compactDisplayName(name: string): string {
  return normalizeName(name).replace(/\s+/g, '').toLowerCase();
}

export function normalizeDisplayName(name: string): string {
  return normalizeName(name);
}

export function isReservedOrganiserDisplayName(name: string): boolean {
  return compactDisplayName(name) === compactDisplayName(BOOTSTRAP_ADMIN_USERNAME);
}

type UserRow = {
  id: string;
  password_hash: string;
  display_name: string;
  is_admin: number;
  must_change_password: number;
};

function rowToUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    displayName: row.display_name,
    isAdmin: row.is_admin === 1,
    mustChangePassword: row.must_change_password === 1
  };
}

export function assertPlayerCanPredict(user: AuthUser): void {
  if (user.isAdmin) {
    throw new Error('Admin accounts cannot submit predictions.');
  }
}

async function purgeAdminPredictionData(userId: string): Promise<void> {
  const db = getDb();
  await db.run(`DELETE FROM predictions WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM prediction_meta WHERE user_id = ?`, [userId]);
}

export async function ensureBootstrapAdmin(): Promise<void> {
  const db = getDb();
  const name = normalizeName(BOOTSTRAP_ADMIN_USERNAME);
  const existing = await db.get<{ id: string }>(
    `SELECT id FROM users WHERE LOWER(display_name) = LOWER(?)`,
    [name]
  );

  if (existing) {
    await db.run(`UPDATE users SET is_admin = 1, must_change_password = 0 WHERE id = ?`, [
      existing.id
    ]);
    await purgeAdminPredictionData(existing.id);
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const email = `${id}@wcb.local`;
  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, is_admin, must_change_password, created_at)
     VALUES (?, ?, ?, ?, 1, 0, ?)`,
    [id, email, hashPassword(BOOTSTRAP_ADMIN_PASSWORD), name, now]
  );
}

export async function createPlayerAccount(
  displayName: string,
  initialPassword: string
): Promise<AuthUser> {
  const name = normalizeName(displayName);
  if (name.length < 2) {
    throw new Error('Name must be at least 2 characters');
  }
  if (isReservedOrganiserDisplayName(name)) {
    throw new Error('That username is reserved for the organiser account');
  }
  if (initialPassword.length < 1 || initialPassword.length > PLAYER_PASSWORD_MAX_LENGTH) {
    throw new Error(`Temporary password must be 1–${PLAYER_PASSWORD_MAX_LENGTH} characters`);
  }

  const db = getDb();
  const existing = await db.get<{ id: string }>(
    `SELECT id FROM users WHERE LOWER(display_name) = LOWER(?)`,
    [name]
  );
  if (existing) {
    throw new Error('That name is already taken');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const email = `${id}@wcb.local`;

  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, is_admin, must_change_password, created_at)
     VALUES (?, ?, ?, ?, 0, 1, ?)`,
    [id, email, hashPassword(initialPassword), name, now]
  );
  await db.run(`INSERT INTO prediction_meta (user_id, committed_at) VALUES (?, ?)`, [id, now]);

  return {
    id,
    displayName: name,
    isAdmin: false,
    mustChangePassword: true
  };
}

export async function login(
  displayName: string,
  password: string
): Promise<{ user: AuthUser; token: string }> {
  const db = getDb();
  const name = normalizeName(displayName);
  const row = await db.get<UserRow>(
    `SELECT id, password_hash, display_name, is_admin, must_change_password
     FROM users WHERE LOWER(display_name) = LOWER(?)`,
    [name]
  );

  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new Error('Invalid credentials');
  }

  const token = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await db.run(
    `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    [token, row.id, now.toISOString(), expires.toISOString()]
  );

  return {
    token,
    user: rowToUser(row)
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 1 || newPassword.length > PLAYER_PASSWORD_MAX_LENGTH) {
    throw new Error(`Password must be up to ${PLAYER_PASSWORD_MAX_LENGTH} characters`);
  }

  const db = getDb();
  const row = await db.get<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE id = ?`,
    [userId]
  );
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    throw new Error('Current password is incorrect');
  }

  await db.run(`UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`, [
    hashPassword(newPassword),
    userId
  ]);
}

export async function requireUser(
  token: string | undefined,
  options?: { allowPasswordChange?: boolean }
): Promise<AuthUser> {
  if (!token) throw new Error('Missing auth token');

  const db = getDb();
  const row = await db.get<UserRow>(
    `SELECT u.id, u.display_name, u.is_admin, u.must_change_password
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, new Date().toISOString()]
  );

  if (!row) throw new Error('Unauthorized');

  if (row.must_change_password === 1 && !options?.allowPasswordChange) {
    throw new Error('PASSWORD_CHANGE_REQUIRED');
  }

  return rowToUser(row);
}

export async function requireAdmin(token: string | undefined): Promise<AuthUser> {
  const user = await requireUser(token);
  if (!user.isAdmin) throw new Error('Admin only');
  return user;
}

export async function deletePlayerAccount(userId: string): Promise<void> {
  const db = getDb();
  const row = await db.get<{ id: string; is_admin: number; display_name: string }>(
    `SELECT id, is_admin, display_name FROM users WHERE id = ?`,
    [userId]
  );
  if (!row) {
    throw new Error('Player not found');
  }
  if (row.is_admin === 1 || isReservedOrganiserDisplayName(row.display_name)) {
    throw new Error('Cannot delete admin or organiser accounts');
  }

  await db.transaction(async (tx) => {
    await tx.run(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
    await tx.run(`DELETE FROM predictions WHERE user_id = ?`, [userId]);
    await tx.run(`DELETE FROM prediction_meta WHERE user_id = ?`, [userId]);
    await tx.run(`DELETE FROM users WHERE id = ?`, [userId]);
  });
}

export async function listPlayers(): Promise<
  Array<{ id: string; displayName: string; mustChangePassword: boolean; createdAt: string }>
> {
  const db = getDb();
  const rows = await db.all<{
    id: string;
    display_name: string;
    must_change_password: number;
    created_at: string;
    is_admin: number;
  }>(
    `SELECT id, display_name, must_change_password, created_at, is_admin
     FROM users
     WHERE is_admin = 0
     ORDER BY display_name`
  );
  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    mustChangePassword: row.must_change_password === 1,
    createdAt: row.created_at
  }));
}
