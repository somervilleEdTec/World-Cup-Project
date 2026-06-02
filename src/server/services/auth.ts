import crypto from 'node:crypto';
import { getDb } from '../database';

const SESSION_TTL_HOURS = 24 * 30;
export const JOIN_PASSWORD = process.env.JOIN_PASSWORD ?? 'MadSlags1';

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
}

function normalizeName(name: string): string {
  return name.trim();
}

export async function register(
  displayName: string,
  password: string,
  joinPassword: string
): Promise<AuthUser> {
  if (joinPassword !== JOIN_PASSWORD) {
    throw new Error('Invalid sign-up password');
  }

  const name = normalizeName(displayName);
  if (name.length < 2) {
    throw new Error('Name must be at least 2 characters');
  }
  if (password.length < 1 || password.length > 6) {
    throw new Error('Password must be 1–6 characters');
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
  const passwordHash = hashPassword(password);
  const email = `${id}@wcb.local`;

  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, email, passwordHash, name, now]
  );

  await db.run(`INSERT INTO prediction_meta (user_id, committed_at) VALUES (?, ?)`, [id, now]);

  return { id, displayName: name, isAdmin: false };
}

export async function login(displayName: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const db = getDb();
  const name = normalizeName(displayName);
  const row = await db.get<{
    id: string;
    password_hash: string;
    display_name: string;
    is_admin: number;
  }>(`SELECT id, password_hash, display_name, is_admin FROM users WHERE LOWER(display_name) = LOWER(?)`, [name]);

  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new Error('Invalid credentials');
  }

  const token = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await db.run(`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`, [
    token,
    row.id,
    now.toISOString(),
    expires.toISOString()
  ]);

  return {
    token,
    user: { id: row.id, displayName: row.display_name, isAdmin: row.is_admin === 1 }
  };
}

export async function requireUser(token: string | undefined): Promise<AuthUser> {
  if (!token) throw new Error('Missing auth token');

  const db = getDb();
  const row = await db.get<{
    id: string;
    display_name: string;
    is_admin: number;
  }>(
    `SELECT u.id, u.display_name, u.is_admin
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, new Date().toISOString()]
  );

  if (!row) throw new Error('Unauthorized');
  return { id: row.id, displayName: row.display_name, isAdmin: row.is_admin === 1 };
}
