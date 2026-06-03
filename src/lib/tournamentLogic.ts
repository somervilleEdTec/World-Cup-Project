import { groupMatches, teams } from '../data/tournament';
import { getDownstreamKnockoutMatchIds } from './bracketEngine';
import { computeGroupPositions } from './groupStandings';
import { getMatches } from './matchResolver';
import { picksFromActuals } from './pickUtils';
import { isKnockout, kickoffReached } from './pickLocks';
import { ActualResult, Match, Pick, TournamentBonusPick } from '../types';

export {
  isGroupStage,
  isKnockout,
  isKnockoutFixtureLocked,
  kickoffReached,
  shouldLockGroup
} from './pickLocks';

export function requiresProgressionPick(match: Match, pick: Pick): boolean {
  return isKnockout(match) && pick.homeScore === pick.awayScore;
}

export function validatePick(match: Match, pick: Pick): string[] {
  const errors: string[] = [];
  if (pick.homeScore < 0 || pick.awayScore < 0) {
    errors.push('Scores cannot be negative.');
  }
  if (requiresProgressionPick(match, pick) && !pick.progressingTeamId) {
    errors.push('Draw selected — choose the team that progresses.');
  }
  return errors;
}

export function lockableKnockoutMatchIds(
  nowIso = new Date().toISOString(),
  picks: Record<string, Pick> = {},
  actuals: Record<string, ActualResult> = {}
): string[] {
  const matches = getMatches(picks, actuals);
  return matches.filter((m) => isKnockout(m) && kickoffReached(m.kickoff, nowIso)).map((m) => m.id);
}

export function affectedFutureMatches(changedMatchId: string): string[] {
  if (changedMatchId.startsWith('g-')) {
    return getMatches().filter((m) => isKnockout(m)).map((m) => m.id);
  }
  return getDownstreamKnockoutMatchIds(changedMatchId);
}

export { computeGroupPositions, computeGroupStandings, type GroupRow } from './groupStandings';

export function computeScore(
  picks: Record<string, Pick>,
  actuals: Record<string, ActualResult>,
  bonusPicks: TournamentBonusPick | undefined,
  finalPlacings: TournamentBonusPick | undefined
): { points: number; exactScores: number; correctResults: number; exactGroupPositions: number; bonusHits: number } {
  let points = 0;
  let exactScores = 0;
  let correctResults = 0;

  const resultKey = (h: number, a: number): 'H' | 'A' | 'D' => (h > a ? 'H' : h < a ? 'A' : 'D');

  Object.values(actuals).forEach((actual) => {
    const pick = picks[actual.matchId];
    if (!pick) return;

    const correctResult = resultKey(pick.homeScore, pick.awayScore) === resultKey(actual.homeScore, actual.awayScore);
    if (correctResult) {
      points += 2;
      correctResults += 1;
    }

    if (pick.homeScore === actual.homeScore && pick.awayScore === actual.awayScore) {
      points += 4;
      exactScores += 1;
    }
  });

  let exactGroupPositions = 0;
  const groups = [...new Set(teams.map((team) => team.group))];
  const actualPicks = picksFromActuals(actuals);
  groups.forEach((groupId) => {
    const groupMatchIds = groupMatches.filter((m) => m.group === groupId).map((m) => m.id);
    const groupComplete = groupMatchIds.every((id) => actuals[id] !== undefined);
    if (!groupComplete) return;

    const predictedPositions = computeGroupPositions(groupId, picks);
    const actualPositions = computeGroupPositions(groupId, actualPicks);
    predictedPositions.forEach((teamId, idx) => {
      if (actualPositions[idx] === teamId) {
        exactGroupPositions += 1;
        points += 1;
      }
    });
  });

  let bonusHits = 0;
  if (bonusPicks && finalPlacings) {
    if (bonusPicks.winnerTeamId === finalPlacings.winnerTeamId) {
      points += 6;
      bonusHits += 1;
    }
    if (bonusPicks.runnerUpTeamId === finalPlacings.runnerUpTeamId) {
      points += 5;
      bonusHits += 1;
    }
    if (bonusPicks.thirdTeamId === finalPlacings.thirdTeamId) {
      points += 4;
      bonusHits += 1;
    }
    if (bonusPicks.fourthTeamId === finalPlacings.fourthTeamId) {
      points += 3;
      bonusHits += 1;
    }
  }

  return { points, exactScores, correctResults, exactGroupPositions, bonusHits };
}
