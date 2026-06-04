// @vitest-environment node
import request from 'supertest';
import type { Express } from 'express';
import {
  BOOTSTRAP_ADMIN_PASSWORD,
  BOOTSTRAP_ADMIN_USERNAME
} from '../services/auth';

export async function adminToken(app: Express): Promise<string> {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ displayName: BOOTSTRAP_ADMIN_USERNAME, password: BOOTSTRAP_ADMIN_PASSWORD });
  if (login.status !== 200) {
    throw new Error(`Admin login failed: ${login.status} ${JSON.stringify(login.body)}`);
  }
  return login.body.token as string;
}

const DEFAULT_PLAYER_PASSWORD = 'abc';

export async function createPlayer(
  app: Express,
  displayName: string,
  initialPassword = DEFAULT_PLAYER_PASSWORD
): Promise<void> {
  const token = await adminToken(app);
  const res = await request(app)
    .post('/api/admin/players')
    .set('Authorization', `Bearer ${token}`)
    .send({ displayName, initialPassword });
  if (res.status !== 200) {
    throw new Error(`Create player failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
}

export async function loginPlayer(
  app: Express,
  displayName: string,
  password: string
): Promise<string> {
  const login = await request(app).post('/api/auth/login').send({ displayName, password });
  if (login.status !== 200) {
    throw new Error(`Login failed: ${login.status} ${JSON.stringify(login.body)}`);
  }
  return login.body.token as string;
}

/** Log in after setting a personal password (skips forced-change gate). */
export async function loginPlayerReady(
  app: Express,
  displayName: string,
  initialPassword = DEFAULT_PLAYER_PASSWORD,
  newPassword = 'xyz'
): Promise<string> {
  let token = await loginPlayer(app, displayName, initialPassword);
  const change = await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${token}`)
    .send({ currentPassword: initialPassword, newPassword });
  if (change.status !== 200) {
    throw new Error(`Password change failed: ${change.status} ${JSON.stringify(change.body)}`);
  }
  token = await loginPlayer(app, displayName, newPassword);
  return token;
}
