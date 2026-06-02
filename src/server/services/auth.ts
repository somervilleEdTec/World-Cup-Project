import crypto from 'node:crypto';
import { getDb } from '../database';

const SESSION_TTL_HOURS = 24 * 30;

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
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export async function register(email: string, password: string, displayName: string): Promise<AuthUser> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(password);

  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, email.toLowerCase(), passwordHash, displayName, now]
  );

  await db.run(`INSERT INTO prediction_meta (user_id, committed_at) VALUES (?, ?)`, [id, now]);

  return { id, email: email.toLowerCase(), displayName, isAdmin: false };
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const db = getDb();
  const row = await db.get<{
    id: string;
    email: string;
    password_hash: string;
    display_name: string;
    is_admin: number;
  }>(`SELECT id, email, password_hash, display_name, is_admin FROM users WHERE email = ?`, [
    email.toLowerCase()
  ]);

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
    user: { id: row.id, email: row.email, displayName: row.display_name, isAdmin: row.is_admin === 1 }
  };
}

export async function requireUser(token: string | undefined): Promise<AuthUser> {
  if (!token) throw new Error('Missing auth token');

  const db = getDb();
  const row = await db.get<{
    id: string;
    email: string;
    display_name: string;
    is_admin: number;
  }>(
    `SELECT u.id, u.email, u.display_name, u.is_admin
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, new Date().toISOString()]
  );

  if (!row) throw new Error('Unauthorized');
  return { id: row.id, email: row.email, displayName: row.display_name, isAdmin: row.is_admin === 1 };
}
