import { teams } from '../data/tournament';
import { Match } from '../types';

export type KnockoutOrientationStatus = 'ok' | 'swapped' | 'mismatch' | 'incomplete';

export interface KnockoutOrientationCheck {
  status: KnockoutOrientationStatus;
  internalHomeTeamId: string;
  internalAwayTeamId: string;
  providerHomeTeamId?: string;
  providerAwayTeamId?: string;
}

/** Compare internal fixture home/away to a provider fixture (football-data.org). */
export function compareKnockoutOrientation(
  match: Pick<Match, 'homeTeamId' | 'awayTeamId'>,
  providerHomeTeamId: string | null | undefined,
  providerAwayTeamId: string | null | undefined
): KnockoutOrientationCheck {
  const result: KnockoutOrientationCheck = {
    status: 'incomplete',
    internalHomeTeamId: match.homeTeamId,
    internalAwayTeamId: match.awayTeamId,
    providerHomeTeamId: providerHomeTeamId ?? undefined,
    providerAwayTeamId: providerAwayTeamId ?? undefined
  };

  if (
    match.homeTeamId === 'tbd' ||
    match.awayTeamId === 'tbd' ||
    !providerHomeTeamId ||
    !providerAwayTeamId
  ) {
    return result;
  }

  const direct =
    match.homeTeamId === providerHomeTeamId && match.awayTeamId === providerAwayTeamId;
  const swapped =
    match.homeTeamId === providerAwayTeamId && match.awayTeamId === providerHomeTeamId;

  if (direct) {
    return { ...result, status: 'ok' };
  }
  if (swapped) {
    return { ...result, status: 'swapped' };
  }
  return { ...result, status: 'mismatch' };
}

export function formatKnockoutOrientationLabel(
  homeTeamId: string,
  awayTeamId: string
): string {
  const home = teams.find((team) => team.id === homeTeamId)?.name ?? homeTeamId;
  const away = teams.find((team) => team.id === awayTeamId)?.name ?? awayTeamId;
  return `${home} vs ${away}`;
}
