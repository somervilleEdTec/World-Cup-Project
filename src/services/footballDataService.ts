import { ActualResult } from '../types';

/**
 * football-data.org client — match scores, fixtures, and kickoffs only.
 *
 * Do NOT add FIFA world ranking fetch/sync here. Group tiebreakers use the frozen
 * tournament-start snapshot in `src/data/fifaWorldRankingTournamentStart2026.ts`.
 */
const API_BASE = 'https://api.football-data.org/v4';
const WORLD_CUP_CODE = 'WC';
const PROVIDER = 'football-data.org';

interface FootballDataTeam {
  id: number;
  name: string | null;
  shortName?: string | null;
}

type FootballDataScoreLine = {
  home?: number | null;
  away?: number | null;
  homeTeam?: number | null;
  awayTeam?: number | null;
};

type FootballDataMatchDuration = 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';

interface FootballDataScore {
  duration?: FootballDataMatchDuration;
  fullTime: FootballDataScoreLine;
  regularTime?: FootballDataScoreLine | null;
  extraTime?: FootballDataScoreLine | null;
  penalties?: FootballDataScoreLine | null;
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
}

interface FootballDataMatch {
  id: number;
  status: string;
  utcDate: string;
  stage?: string;
  group?: string | null;
  matchday?: number | null;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: FootballDataScore;
}

function readScoreLine(
  line: FootballDataScoreLine | null | undefined
): { home: number; away: number } | null {
  if (!line) return null;
  const home = line.home ?? line.homeTeam;
  const away = line.away ?? line.awayTeam;
  if (home == null || away == null) return null;
  return { home, away };
}

/** 90-minute scoreline for predictions; ET and penalty goals are excluded. */
export function ninetyMinuteScore(
  score: FootballDataScore
): { home: number; away: number } | null {
  const fullTime = readScoreLine(score.fullTime);
  if (!fullTime) return null;

  if (score.duration === 'EXTRA_TIME' || score.duration === 'PENALTY_SHOOTOUT') {
    const regularTime = readScoreLine(score.regularTime);
    if (regularTime) return regularTime;
  }

  return fullTime;
}

interface FootballDataResponse {
  matches: FootballDataMatch[];
}

export interface FootballDataResultRow {
  providerId: string;
  homeName: string | null;
  awayName: string | null;
  homeScore: number;
  awayScore: number;
  progressingTeamId?: string;
}

export async function fetchLatestResults(apiToken: string): Promise<FootballDataResultRow[]> {
  const response = await fetch(`${API_BASE}/competitions/${WORLD_CUP_CODE}/matches`, {
    headers: {
      'X-Auth-Token': apiToken
    }
  });

  if (!response.ok) {
    throw new Error(`football-data fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as FootballDataResponse;

  return payload.matches
    .filter((match) => match.status === 'FINISHED' && ninetyMinuteScore(match.score) !== null)
    .map((match) => {
      const scoreline = ninetyMinuteScore(match.score)!;
      return {
        providerId: String(match.id),
        homeName: match.homeTeam.shortName ?? match.homeTeam.name,
        awayName: match.awayTeam.shortName ?? match.awayTeam.name,
        homeScore: scoreline.home,
        awayScore: scoreline.away,
        // winner resolves the advancer when 90-minute scores are level after ET/pens.
        progressingTeamId:
          match.score.winner === 'HOME_TEAM'
            ? 'home'
            : match.score.winner === 'AWAY_TEAM'
              ? 'away'
              : undefined
      };
    });
}

export interface FootballDataFixtureRow {
  providerId: string;
  homeName: string | null;
  awayName: string | null;
  kickoff: string;
  status: string;
  stage?: string;
  group?: string;
  matchday?: number;
}

export async function fetchCompetitionFixtures(
  apiToken: string
): Promise<FootballDataFixtureRow[]> {
  const response = await fetch(`${API_BASE}/competitions/${WORLD_CUP_CODE}/matches`, {
    headers: { 'X-Auth-Token': apiToken }
  });

  if (!response.ok) {
    throw new Error(`football-data fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as FootballDataResponse;

  return payload.matches.map((match) => ({
    providerId: String(match.id),
    homeName: match.homeTeam.shortName ?? match.homeTeam.name,
    awayName: match.awayTeam.shortName ?? match.awayTeam.name,
    kickoff: new Date(match.utcDate).toISOString(),
    status: match.status,
    stage: match.stage,
    group: match.group ?? undefined,
    matchday: match.matchday ?? undefined
  }));
}

export { PROVIDER };
