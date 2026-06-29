import { describe, expect, it } from 'vitest';
import { bonusTeamIds, isCorrectBonusPick } from '../lib/overallPicks';

describe('overallPicks helpers', () => {
  const bonus = {
    winnerTeamId: 'brazil',
    runnerUpTeamId: 'france',
    thirdTeamId: 'argentina',
    fourthTeamId: 'england'
  };

  it('returns team ids in podium order', () => {
    expect(bonusTeamIds(bonus)).toEqual(['brazil', 'france', 'argentina', 'england']);
  });

  it('detects correct bonus picks against actual placings', () => {
    expect(isCorrectBonusPick(0, 'brazil', bonus)).toBe(true);
    expect(isCorrectBonusPick(1, 'spain', bonus)).toBe(false);
    expect(isCorrectBonusPick(2, 'argentina', bonus)).toBe(true);
  });
});
