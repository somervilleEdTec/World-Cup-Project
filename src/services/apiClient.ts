import { TournamentBonusPick, Pick } from '../types';

/** Same-origin when the API serves the built SPA; dev falls back to :8787 unless proxied. */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:8787' : '');
const TOKEN_KEY = 'wcb_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthErrorMessage(message: string): boolean {
  return /unauthor/i.test(message);
}

/** Hide low-level parse/network noise; show actionable errors only. */
export function shouldShowUserError(message: string): boolean {
  return (
    !isAuthErrorMessage(message) &&
    !/JSON\.parse/i.test(message) &&
    !/HTML instead of JSON/i.test(message) &&
    !/Invalid server response/i.test(message)
  );
}

function parseResponseBody(text: string, response: Response): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const preview = text.trim().slice(0, 80);
    const looksHtml = preview.startsWith('<');
    throw new Error(
      looksHtml
        ? `API returned HTML instead of JSON (${response.status}). Check VITE_API_BASE_URL or log in again.`
        : `Invalid server response (${response.status}).`
    );
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await response.text();
  const data = parseResponseBody(text, response);

  if (!response.ok) {
    const error =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${response.status})`;
    throw new Error(error);
  }
  return data as T;
}

export async function register(displayName: string, password: string, joinPassword: string) {
  return request<{ user: { id: string; displayName: string } }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ displayName, password, joinPassword })
  });
}

export async function login(displayName: string, password: string) {
  return request<{ token: string; user: { id: string; displayName: string; isAdmin: boolean } }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ displayName, password })
    }
  );
}

export async function fetchPredictionState() {
  return request('/api/predictions/state');
}

export async function saveDraftPick(pick: Pick) {
  return request('/api/predictions/draft', { method: 'POST', body: JSON.stringify(pick) });
}

export async function markReviewed(matchId: string) {
  return request(`/api/predictions/review/${matchId}`, { method: 'POST' });
}

export async function saveBonusDraft(bonus: TournamentBonusPick) {
  return request('/api/predictions/bonus', { method: 'POST', body: JSON.stringify(bonus) });
}

export async function lockGroup(groupId: string) {
  return request(`/api/predictions/groups/${groupId}/lock`, { method: 'POST' });
}

export async function unlockGroup(groupId: string) {
  return request(`/api/predictions/groups/${groupId}/unlock`, { method: 'POST' });
}

export async function commitDraft() {
  return request('/api/predictions/commit', { method: 'POST' });
}

export async function fetchLeaderboard() {
  return request('/api/leaderboard');
}

export async function runSync() {
  return request('/api/admin/sync/run', { method: 'POST' });
}

export async function runFixtureSync() {
  return request('/api/admin/fixtures/sync', { method: 'POST' });
}

export async function fetchMappingDiagnostics() {
  return request('/api/admin/mapping-diagnostics');
}

export async function fetchSyncStatus() {
  return request('/api/admin/sync-status');
}

export async function manualOverride(payload: {
  matchId: string;
  homeScore: number;
  awayScore: number;
  progressingTeamId?: string;
  status: 'FINISHED';
}) {
  return request('/api/admin/results/override', { method: 'POST', body: JSON.stringify(payload) });
}

export async function recomputeLeaderboard() {
  return request('/api/admin/leaderboard/recompute', { method: 'POST' });
}

export async function fetchNextMatchComparison() {
  return request('/api/comparison/next');
}

export async function fetchMatchComparison(matchId: string) {
  return request(`/api/comparison/${matchId}`);
}

export async function fetchComparisonFixtures() {
  return request<
    Array<{
      id: string;
      stage: string;
      group?: string;
      kickoff: string;
      homeTeamId: string;
      awayTeamId: string;
    }>
  >('/api/comparison/fixtures');
}
