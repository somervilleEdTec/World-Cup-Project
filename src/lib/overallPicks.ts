import { TournamentBonusPick } from '../types';

export const BONUS_SLOT_LABELS = ['1st', '2nd', '3rd', '4th'] as const;

export const BONUS_SLOT_TEAM_KEYS = [
  'winnerTeamId',
  'runnerUpTeamId',
  'thirdTeamId',
  'fourthTeamId'
] as const satisfies ReadonlyArray<keyof TournamentBonusPick>;

export function bonusTeamIds(bonus: TournamentBonusPick): string[] {
  return BONUS_SLOT_TEAM_KEYS.map((key) => bonus[key]);
}

export function isCorrectBonusPick(
  slotIndex: number,
  teamId: string,
  actualPlacings?: TournamentBonusPick
): boolean {
  if (!actualPlacings || !teamId) return false;
  return bonusTeamIds(actualPlacings)[slotIndex] === teamId;
}
