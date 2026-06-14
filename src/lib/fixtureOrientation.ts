import { teamIdFromProviderName } from '../server/services/matchMapping';

export interface NormalizedScores {
  homeScore: number;
  awayScore: number;
  progressingTeamHint?: 'home' | 'away';
}

/** Align provider scores to internal fixture home/away orientation. */
export function normalizeScoresToInternalFixture(
  internalHomeTeamId: string,
  internalAwayTeamId: string,
  providerHomeName: string | null | undefined,
  providerAwayName: string | null | undefined,
  providerHomeScore: number,
  providerAwayScore: number,
  progressingTeamHint?: string
): NormalizedScores {
  const providerHomeId = teamIdFromProviderName(providerHomeName);
  const providerAwayId = teamIdFromProviderName(providerAwayName);

  const direct = providerHomeId === internalHomeTeamId && providerAwayId === internalAwayTeamId;
  const swapped = providerHomeId === internalAwayTeamId && providerAwayId === internalHomeTeamId;

  const homeScore = swapped ? providerAwayScore : providerHomeScore;
  const awayScore = swapped ? providerHomeScore : providerAwayScore;

  let hint: 'home' | 'away' | undefined;
  if (progressingTeamHint === 'home' || progressingTeamHint === 'away') {
    if (direct) {
      hint = progressingTeamHint;
    } else if (swapped) {
      hint = progressingTeamHint === 'home' ? 'away' : 'home';
    }
  }

  return { homeScore, awayScore, progressingTeamHint: hint };
}
