// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach, vi } from 'vitest';
import type { Express } from 'express';
import { setupTestServer, teardownTestServer } from '../testHarness';
import { getDb } from '../database';
import { getResultsMap } from '../services/leaderboard';
import { syncFootballData } from '../services/sync';
import { fetchLatestResults } from '../../services/footballDataService';

vi.mock('../../services/footballDataService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/footballDataService')>();
  return {
    ...actual,
    fetchLatestResults: vi.fn()
  };
});

const mockedFetchLatestResults = vi.mocked(fetchLatestResults);

let app: Express;

beforeEach(async () => {
  app = await setupTestServer();
  mockedFetchLatestResults.mockReset();
});

afterAll(async () => {
  await teardownTestServer();
});

describe('syncFootballData manual override protection', () => {
  it('does not overwrite results with source manual-override', async () => {
    void app;
    const db = getDb();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO results (match_id, home_score, away_score, progressing_team_id, status, source, updated_at)
       VALUES ('g-h-3', 4, 0, 'spain', 'FINISHED', 'manual-override', ?)`,
      [now]
    );

    mockedFetchLatestResults.mockResolvedValue([
      {
        providerId: '537371',
        homeName: 'Spain',
        awayName: 'Saudi Arabia',
        homeScore: 5,
        awayScore: 0,
        progressingTeamId: 'home'
      }
    ]);

    const result = await syncFootballData('test-token');
    const stored = (await getResultsMap())['g-h-3'];

    expect(result.ok).toBe(true);
    expect(stored?.homeScore).toBe(4);
    expect(stored?.awayScore).toBe(0);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it('still updates football-data.org results when not manually overridden', async () => {
    void app;
    const db = getDb();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO results (match_id, home_score, away_score, progressing_team_id, status, source, updated_at)
       VALUES ('g-h-3', 3, 0, 'spain', 'FINISHED', 'football-data.org', ?)`,
      [now]
    );

    mockedFetchLatestResults.mockResolvedValue([
      {
        providerId: '537371',
        homeName: 'Spain',
        awayName: 'Saudi Arabia',
        homeScore: 5,
        awayScore: 0,
        progressingTeamId: 'home'
      }
    ]);

    const result = await syncFootballData('test-token');
    const stored = (await getResultsMap())['g-h-3'];

    expect(result.ok).toBe(true);
    expect(stored?.homeScore).toBe(5);
    expect(stored?.awayScore).toBe(0);
    expect(result.updated).toBe(1);
  });
});
