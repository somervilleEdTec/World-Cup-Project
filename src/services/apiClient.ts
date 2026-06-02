import { TournamentBonusPick, Pick } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787';
const TOKEN_KEY = 'wcb_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

export async function register(email: string, password: string, displayName: string) {
  return request<{ user: { id: string; email: string } }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName })
  });
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: { id: string; email: string; displayName: string; isAdmin: boolean } }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password })
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

export async function commitDraft() {
  return request('/api/predictions/commit', { method: 'POST' });
}

export async function fetchLeaderboard() {
  return request('/api/leaderboard');
}

export async function runSync() {
  return request('/api/admin/sync/run', { method: 'POST' });
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
