import { describe, expect, it } from 'vitest';
import { Match } from '../types';
import { UserPicks } from '../lib/predictionStats';
import {
  isFinishingPositionStage,
  leapfrogPointsThreshold,
  maxBonusPointSwing
} from '../lib/tournamentBonus';

const bonusA = {
  winnerTeamId: 'brazil',
  runnerUpTeamId: 'france',
  thirdTeamId: 'germany',
  fourthTeamId: 'spain'
};

const bonusB = {
  winnerTeamId: 'argentina',
  runnerUpTeamId: 'france',
  thirdTeamId: 'germany',
  fourthTeamId: 'portugal'
};

function userWithBonus(userId: string, bonus: typeof bonusA): UserPicks {
  return {
    userId,
    displayName: userId,
    picks: {},
    bonus
  };
}

describe('tournamentBonus leapfrog helpers', () => {
  it('identifies finishing-position stages', () => {
    expect(isFinishingPositionStage('FINAL')).toBe(true);
    expect(isFinishingPositionStage('THIRD_PLACE')).toBe(true);
    expect(isFinishingPositionStage('SF')).toBe(false);
    expect(isFinishingPositionStage('GROUP')).toBe(false);
  });

  it('returns zero bonus swing for identical committed picks', () => {
    const userA = userWithBonus('u1', bonusA);
    const userB = userWithBonus('u2', bonusA);
    expect(maxBonusPointSwing(userA, userB)).toBe(0);
  });

  it('sums slot values when bonus picks differ', () => {
    const userA = userWithBonus('u1', bonusA);
    const userB = userWithBonus('u2', bonusB);
    expect(maxBonusPointSwing(userA, userB)).toBe(9);
  });

  it('adds all slot values when every bonus pick differs', () => {
    const userA = userWithBonus('u1', bonusA);
    const userB = userWithBonus('u2', {
      winnerTeamId: 'argentina',
      runnerUpTeamId: 'germany',
      thirdTeamId: 'spain',
      fourthTeamId: 'portugal'
    });
    expect(maxBonusPointSwing(userA, userB)).toBe(18);
  });

  it('uses match-only threshold outside finishing stages', () => {
    const match: Match = {
      id: 'g-a-1',
      stage: 'GROUP',
      group: 'A',
      kickoff: '2026-06-12T19:00:00.000Z',
      homeTeamId: 'mexico',
      awayTeamId: 'south-africa'
    };
    const userA = userWithBonus('u1', bonusA);
    const userB = userWithBonus('u2', bonusB);
    expect(leapfrogPointsThreshold(match, userA, userB)).toBe(6);
  });

  it('includes bonus swing on final fixtures', () => {
    const match: Match = {
      id: 'final',
      stage: 'FINAL',
      kickoff: '2026-07-19T19:00:00.000Z',
      homeTeamId: 'brazil',
      awayTeamId: 'argentina'
    };
    const userA = userWithBonus('u1', bonusA);
    const userB = userWithBonus('u2', bonusB);
    expect(leapfrogPointsThreshold(match, userA, userB)).toBe(27);
  });
});
