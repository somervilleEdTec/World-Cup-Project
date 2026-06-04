import { describe, expect, it } from 'vitest';
import {
  allPrimaryTieBreakersEqual,
  compareFinalTieBreak,
  isTournamentFinalComplete,
  resolveCoinFlipAmongTied,
  virtualCoinFlipOutcome,
  virtualCoinFlipPriority
} from '../lib/tieBreakCoinFlip';

describe('tieBreakCoinFlip', () => {
  it('detects when the tournament final has a result', () => {
    expect(isTournamentFinalComplete({})).toBe(false);
    expect(isTournamentFinalComplete({ final: { matchId: 'final' } })).toBe(true);
  });

  it('assigns a stable virtual coin flip per user', () => {
    const a = virtualCoinFlipPriority('user-a');
    const b = virtualCoinFlipPriority('user-b');
    expect(a).toBe(virtualCoinFlipPriority('user-a'));
    expect(b).toBe(virtualCoinFlipPriority('user-b'));
    expect(a).not.toBe(b);
  });

  it('uses coin flip only after the final when sorting tie-break #5', () => {
    const alice = { userId: 'alice-id', name: 'Alice' };
    const bob = { userId: 'bob-id', name: 'Bob' };
    expect(compareFinalTieBreak(alice, bob, false)).toBe(alice.name.localeCompare(bob.name));
    const afterFinal = compareFinalTieBreak(alice, bob, true);
    expect(Math.sign(afterFinal)).toBe(Math.sign(compareFinalTieBreak(alice, bob, true)));
  });

  it('resolves a fully tied group after the final', () => {
    const tieBreak = {
      exactScores: 3,
      correctResults: 5,
      exactGroupPositions: 2,
      bonusHits: 1
    };
    const entries = [
      { userId: 'u1', name: 'One', points: 40, tieBreak },
      { userId: 'u2', name: 'Two', points: 40, tieBreak },
      { userId: 'u3', name: 'Three', points: 30, tieBreak: { ...tieBreak, exactScores: 1 } }
    ];
    const resolution = resolveCoinFlipAmongTied(entries, true);
    expect(resolution).not.toBeNull();
    expect(resolution?.userIds).toHaveLength(2);
    expect(resolution?.winnerUserId).toBeTruthy();
    expect(resolution?.outcomes.every((o) => o.outcome === 'heads' || o.outcome === 'tails')).toBe(
      true
    );
  });

  it('returns null when final is not complete', () => {
    const resolution = resolveCoinFlipAmongTied(
      [
        {
          userId: 'u1',
          name: 'A',
          points: 10,
          tieBreak: { exactScores: 0, correctResults: 0, exactGroupPositions: 0, bonusHits: 0 }
        },
        {
          userId: 'u2',
          name: 'B',
          points: 10,
          tieBreak: { exactScores: 0, correctResults: 0, exactGroupPositions: 0, bonusHits: 0 }
        }
      ],
      false
    );
    expect(resolution).toBeNull();
  });

  it('maps outcome to heads or tails', () => {
    expect(['heads', 'tails']).toContain(virtualCoinFlipOutcome('test-user-xyz'));
  });
});
