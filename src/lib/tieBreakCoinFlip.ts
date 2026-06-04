import crypto from 'node:crypto';

export const TOURNAMENT_FINAL_MATCH_ID = 'final';

/** Deterministic virtual coin flip (0–999). Higher value wins a tie after the final. */
export function virtualCoinFlipPriority(userId: string, salt = 'worldcup-boys-2026'): number {
  const hash = crypto.createHash('sha256').update(`${userId}:${salt}`, 'utf8').digest();
  return hash[0] * 256 + hash[1];
}

export function virtualCoinFlipOutcome(userId: string): 'heads' | 'tails' {
  return virtualCoinFlipPriority(userId) % 2 === 0 ? 'heads' : 'tails';
}

export function isTournamentFinalComplete(
  results: Record<string, { matchId: string } | undefined>
): boolean {
  return results[TOURNAMENT_FINAL_MATCH_ID] !== undefined;
}

export interface LeaderboardTieBreakInput {
  userId: string;
  points: number;
  tieBreak: {
    exactScores: number;
    correctResults: number;
    exactGroupPositions: number;
    bonusHits: number;
  };
}

export function allPrimaryTieBreakersEqual(
  a: LeaderboardTieBreakInput,
  b: LeaderboardTieBreakInput
): boolean {
  return (
    a.points === b.points &&
    a.tieBreak.exactScores === b.tieBreak.exactScores &&
    a.tieBreak.correctResults === b.tieBreak.correctResults &&
    a.tieBreak.exactGroupPositions === b.tieBreak.exactGroupPositions &&
    a.tieBreak.bonusHits === b.tieBreak.bonusHits
  );
}

/** Sort key for tie-breaker #5: coin flip after final; stable name order before final. */
export function compareFinalTieBreak(
  a: { userId: string; name: string },
  b: { userId: string; name: string },
  finalComplete: boolean
): number {
  if (!finalComplete) {
    return a.name.localeCompare(b.name);
  }
  return virtualCoinFlipPriority(b.userId) - virtualCoinFlipPriority(a.userId);
}

export interface CoinFlipResolution {
  userIds: string[];
  winnerUserId: string;
  winnerName: string;
  outcomes: Array<{ userId: string; name: string; outcome: 'heads' | 'tails'; priority: number }>;
}

/** When the final is in, find fully tied players and pick the virtual coin-flip winner. */
export function resolveCoinFlipAmongTied(
  entries: Array<LeaderboardTieBreakInput & { name: string }>,
  finalComplete: boolean
): CoinFlipResolution | null {
  if (!finalComplete || entries.length < 2) return null;

  const sorted = [...entries].sort(
    (a, b) =>
      b.points - a.points ||
      b.tieBreak.exactScores - a.tieBreak.exactScores ||
      b.tieBreak.correctResults - a.tieBreak.correctResults ||
      b.tieBreak.exactGroupPositions - a.tieBreak.exactGroupPositions ||
      b.tieBreak.bonusHits - a.tieBreak.bonusHits
  );

  const top = sorted[0];
  const tied = sorted.filter((e) => allPrimaryTieBreakersEqual(top, e));
  if (tied.length < 2) return null;

  const outcomes = tied
    .map((e) => ({
      userId: e.userId,
      name: e.name,
      outcome: virtualCoinFlipOutcome(e.userId),
      priority: virtualCoinFlipPriority(e.userId)
    }))
    .sort((a, b) => b.priority - a.priority);

  return {
    userIds: tied.map((t) => t.userId),
    winnerUserId: outcomes[0].userId,
    winnerName: outcomes[0].name,
    outcomes
  };
}
