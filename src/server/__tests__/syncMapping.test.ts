// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import type { Express } from 'express';
import { setupTestServer, teardownTestServer } from '../testHarness';
import { explainMappingFailure, resolveInternalMatchId } from '../services/matchMapping';
import { PROVIDER } from '../../services/footballDataService';
import { groupMatches, teams } from '../../data/tournament';
import { getDb } from '../database';
import { insertGroupResults } from './testDbHelpers';
import { buildConfirmedKnockoutFixtures } from '../../lib/knockoutFixtureAvailability';
import { getResultsMap } from '../services/leaderboard';

let app: Express;

beforeEach(async () => {
  app = await setupTestServer();
});

afterAll(async () => {
  await teardownTestServer();
});

describe('sync mapping with stored results', () => {
  it('maps group fixtures without official results context', () => {
    const match = groupMatches[0];
    const homeTeam = teams.find((t) => t.id === match.homeTeamId);
    const awayTeam = teams.find((t) => t.id === match.awayTeamId);
    expect(explainMappingFailure(homeTeam!.name, awayTeam!.name, null, {})).toBe('mappable');
  });

  it('registers provider mapping for confirmed knockout fixture teams', async () => {
    void app;
    const db = getDb();
    await insertGroupResults(db, 'A');
    await insertGroupResults(db, 'B');

    const actuals = await getResultsMap();
    const r32 = buildConfirmedKnockoutFixtures(actuals).find((m) => m.id === 'r32-1');
    expect(r32).toBeTruthy();

    const home = teams.find((t) => t.id === r32!.homeTeamId)!;
    const away = teams.find((t) => t.id === r32!.awayTeamId)!;

    const internalId = await resolveInternalMatchId(
      PROVIDER,
      'provider-r32-1-test',
      home.name,
      away.name,
      actuals
    );
    expect(internalId).toBe('r32-1');

    const row = await db.get<{ internal_id: string }>(
      `SELECT internal_id FROM match_external_ids WHERE provider = ? AND provider_id = ?`,
      [PROVIDER, 'provider-r32-1-test']
    );
    expect(row?.internal_id).toBe('r32-1');
  });

  it('does not map knockout teams before bracket resolves them', () => {
    const home = teams.find((t) => t.group === 'A')!;
    const away = teams.find((t) => t.group === 'B' && t.id !== home.id)!;
    expect(explainMappingFailure(home.name, away.name, null, {})).toBe(
      'no_matching_internal_fixture'
    );
  });
});
