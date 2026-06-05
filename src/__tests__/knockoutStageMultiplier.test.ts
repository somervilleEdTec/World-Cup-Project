import { describe, expect, it } from 'vitest';
import { computeMatchPoints } from '../lib/matchScoring';
import {
  knockoutStageHeading,
  knockoutStagePointsMultiplier,
  scaledMatchPointsForStage
} from '../lib/knockoutStageMultiplier';

describe('knockoutStagePointsMultiplier', () => {
  it('returns 1× for early rounds and group', () => {
    expect(knockoutStagePointsMultiplier('GROUP')).toBe(1);
    expect(knockoutStagePointsMultiplier('R32')).toBe(1);
    expect(knockoutStagePointsMultiplier('R16')).toBe(1);
  });

  it('formats stage heading with multiplier', () => {
    expect(knockoutStageHeading('QF')).toBe('Quarter-final (1.5× match points)');
    expect(knockoutStageHeading('R32')).toBe('R32');
  });

  it('returns late-round multipliers', () => {
    expect(knockoutStagePointsMultiplier('QF')).toBe(1.5);
    expect(knockoutStagePointsMultiplier('SF')).toBe(2);
    expect(knockoutStagePointsMultiplier('FINAL')).toBe(3);
    expect(knockoutStagePointsMultiplier('THIRD_PLACE')).toBe(3);
  });
});

describe('scaled match points', () => {
  it('scales QF exact to 9 points (3+6)', () => {
    expect(scaledMatchPointsForStage('QF', { correctResult: true, exactScore: true }).total).toBe(
      9
    );
  });

  it('scales SF result-only to 4 points', () => {
    expect(scaledMatchPointsForStage('SF', { correctResult: true, exactScore: false }).total).toBe(
      4
    );
  });

  it('scales final exact to 18 points (6+12)', () => {
    expect(
      scaledMatchPointsForStage('FINAL', { correctResult: true, exactScore: true }).total
    ).toBe(18);
  });
});

describe('computeMatchPoints with stage', () => {
  const exactPick = { matchId: 'final', homeScore: 2, awayScore: 1 };
  const exactActual = { matchId: 'final', homeScore: 2, awayScore: 1 };
  const finalMatch = { homeTeamId: 'mexico', awayTeamId: 'canada' };

  it('awards 6 for group-stage exact', () => {
    expect(computeMatchPoints(exactPick, exactActual, 'GROUP')).toBe(6);
  });

  it('awards 18 for final exact at 3× when advancer matches', () => {
    expect(computeMatchPoints(exactPick, exactActual, 'FINAL', finalMatch)).toBe(18);
  });
});
