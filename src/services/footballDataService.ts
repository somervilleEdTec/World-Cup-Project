import { ActualResult } from '../types';

const API_BASE = 'https://api.football-data.org/v4';
const WORLD_CUP_CODE = 'WC';
const PROVIDER = 'football-data.org';

interface FootballDataTeam {
  id: number;
  name: string;
  shortName?: string;
}

interface FootballDataMatch {
  id: number;
  status: string;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  };
}

interface FootballDataResponse {
  matches: FootballDataMatch[];
}

export interface FootballDataResultRow {
  providerId: string;
  homeName: string;
  awayName: string;
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
    .filter((match) => match.status === 'FINISHED' && match.score.fullTime.home !== null && match.score.fullTime.away !== null)
    .map((match) => ({
      providerId: String(match.id),
      homeName: match.homeTeam.shortName ?? match.homeTeam.name,
      awayName: match.awayTeam.shortName ?? match.awayTeam.name,
      homeScore: match.score.fullTime.home ?? 0,
      awayScore: match.score.fullTime.away ?? 0,
      progressingTeamId:
        match.score.winner === 'HOME_TEAM'
          ? 'home'
          : match.score.winner === 'AWAY_TEAM'
            ? 'away'
            : undefined
    }));
}

export { PROVIDER };
