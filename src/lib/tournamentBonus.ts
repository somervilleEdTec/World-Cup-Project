import { TournamentBonusPick } from '../types';
import { UserPicks } from './predictionStats';

export function committedBonusPick(bonus?: TournamentBonusPick): TournamentBonusPick | undefined {
  if (!bonus) return undefined;
  const { winnerTeamId, runnerUpTeamId, thirdTeamId, fourthTeamId } = bonus;
  if (!winnerTeamId || !runnerUpTeamId || !thirdTeamId || !fourthTeamId) return undefined;
  return { winnerTeamId, runnerUpTeamId, thirdTeamId, fourthTeamId };
}

export function committedBonusPickFromUser(user: UserPicks): TournamentBonusPick | undefined {
  return committedBonusPick(user.bonus);
}
