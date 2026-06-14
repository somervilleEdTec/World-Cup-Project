import { Match, Stage, TournamentBonusPick } from '../types';
import { maxMatchPointsForStage } from './knockoutStageMultiplier';
import { UserPicks } from './predictionStats';

const BONUS_SLOT_KEYS = [
  'winnerTeamId',
  'runnerUpTeamId',
  'thirdTeamId',
  'fourthTeamId'
] as const satisfies ReadonlyArray<keyof TournamentBonusPick>;

const BONUS_SLOT_POINTS = [6, 5, 4, 3] as const;

export function committedBonusPick(bonus?: TournamentBonusPick): TournamentBonusPick | undefined {
  if (!bonus) return undefined;
  const { winnerTeamId, runnerUpTeamId, thirdTeamId, fourthTeamId } = bonus;
  if (!winnerTeamId || !runnerUpTeamId || !thirdTeamId || !fourthTeamId) return undefined;
  return { winnerTeamId, runnerUpTeamId, thirdTeamId, fourthTeamId };
}

export function committedBonusPickFromUser(user: UserPicks): TournamentBonusPick | undefined {
  return committedBonusPick(user.bonus);
}

export function isFinishingPositionStage(stage: Stage): boolean {
  return stage === 'FINAL' || stage === 'THIRD_PLACE';
}

export function maxBonusPointSwing(userA: UserPicks, userB: UserPicks): number {
  const bonusA = committedBonusPickFromUser(userA);
  const bonusB = committedBonusPickFromUser(userB);
  if (!bonusA || !bonusB) return 0;

  let swing = 0;
  for (let index = 0; index < BONUS_SLOT_KEYS.length; index += 1) {
    const key = BONUS_SLOT_KEYS[index];
    if (bonusA[key] !== bonusB[key]) {
      swing += BONUS_SLOT_POINTS[index];
    }
  }
  return swing;
}

export function leapfrogPointsThreshold(
  match: Match,
  userA: UserPicks,
  userB: UserPicks
): number {
  const matchThreshold = maxMatchPointsForStage(match.stage);
  if (!isFinishingPositionStage(match.stage)) return matchThreshold;
  return matchThreshold + maxBonusPointSwing(userA, userB);
}
