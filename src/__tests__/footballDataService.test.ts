// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLatestResults, ninetyMinuteScore } from '../services/footballDataService';

describe('ninetyMinuteScore', () => {
  it('uses fullTime for regular-time finishes', () => {
    expect(
      ninetyMinuteScore({
        duration: 'REGULAR',
        fullTime: { home: 2, away: 1 },
        winner: 'HOME_TEAM'
      })
    ).toEqual({ home: 2, away: 1 });
  });

  it('uses regularTime after extra time', () => {
    expect(
      ninetyMinuteScore({
        duration: 'EXTRA_TIME',
        fullTime: { home: 2, away: 1 },
        regularTime: { home: 1, away: 1 },
        extraTime: { home: 1, away: 0 },
        winner: 'HOME_TEAM'
      })
    ).toEqual({ home: 1, away: 1 });
  });

  it('uses regularTime after penalty shootout', () => {
    expect(
      ninetyMinuteScore({
        duration: 'PENALTY_SHOOTOUT',
        fullTime: { home: 7, away: 6 },
        regularTime: { home: 1, away: 1 },
        penalties: { home: 6, away: 5 },
        winner: 'HOME_TEAM'
      })
    ).toEqual({ home: 1, away: 1 });
  });

  it('accepts homeTeam/awayTeam score field names from API docs', () => {
    expect(
      ninetyMinuteScore({
        duration: 'PENALTY_SHOOTOUT',
        fullTime: { homeTeam: 7, awayTeam: 6 },
        regularTime: { homeTeam: 1, awayTeam: 1 },
        winner: 'HOME_TEAM'
      })
    ).toEqual({ home: 1, away: 1 });
  });

  it('returns null when fullTime is incomplete', () => {
    expect(
      ninetyMinuteScore({
        fullTime: { home: 1, away: null },
        winner: null
      })
    ).toBeNull();
  });
});

describe('fetchLatestResults', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('imports 90-minute scores and advancing team for penalty shootouts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          matches: [
            {
              id: 123,
              status: 'FINISHED',
              homeTeam: { id: 1, name: 'Germany', shortName: 'Germany' },
              awayTeam: { id: 2, name: 'England', shortName: 'England' },
              score: {
                winner: 'HOME_TEAM',
                duration: 'PENALTY_SHOOTOUT',
                fullTime: { home: 7, away: 6 },
                regularTime: { home: 1, away: 1 },
                penalties: { home: 6, away: 5 }
              }
            }
          ]
        })
      })
    );

    const results = await fetchLatestResults('token');

    expect(results).toEqual([
      {
        providerId: '123',
        homeName: 'Germany',
        awayName: 'England',
        homeScore: 1,
        awayScore: 1,
        progressingTeamId: 'home'
      }
    ]);
  });

  it('imports 90-minute scores for extra-time finishes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          matches: [
            {
              id: 456,
              status: 'FINISHED',
              homeTeam: { id: 3, name: 'France', shortName: 'France' },
              awayTeam: { id: 4, name: 'Brazil', shortName: 'Brazil' },
              score: {
                winner: 'AWAY_TEAM',
                duration: 'EXTRA_TIME',
                fullTime: { home: 1, away: 2 },
                regularTime: { home: 1, away: 1 },
                extraTime: { home: 0, away: 1 }
              }
            }
          ]
        })
      })
    );

    const results = await fetchLatestResults('token');

    expect(results).toEqual([
      {
        providerId: '456',
        homeName: 'France',
        awayName: 'Brazil',
        homeScore: 1,
        awayScore: 1,
        progressingTeamId: 'away'
      }
    ]);
  });
});
