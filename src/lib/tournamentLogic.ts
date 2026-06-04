import { groupMatches, teams } from '../data/tournament';
import { getDownstreamKnockoutMatchIds } from './bracketEngine';
import { computeGroupPositions } from './groupStandings';
import { getMatches } from './matchResolver';
import { scaledMatchPointsForStage } from './knockoutStageMultiplier';
import { picksFromActuals } from './pickUtils';
import { isKnockout, predictionLockReached } from './pickLocks';
import { ActualResult, Match, Pick, TournamentBonusPick } from '../types';

export {
  isGroupStage,
  isKnockout,
  isKnockoutFixtureLocked,
  kickoffReached,
  predictionLockReached,
  predictionLockTimeIso,
  shouldLockGroup
} from './pickLocks';

/** Upper bound for match scores (API + UI); prevents absurd values from tampered requests. */
export const MAX_MATCH_SCORE = 20;

const VALID_TEAM_IDS = new Set(teams.map((team) => team.id));

export function requiresProgressionPick(match: Match, pick: Pick): boolean {
  return isKnockout(match) && pick.homeScore === pick.awayScore;
}

export function validatePick(match: Match, pick: Pick): string[] {
  const errors: string[] = [];
  if (pick.homeScore < 0 || pick.awayScore < 0) {
    errors.push('Scores cannot be negative.');
  }
  if (pick.homeScore > MAX_MATCH_SCORE || pick.awayScore > MAX_MATCH_SCORE) {
    errors.push(`Scores cannot exceed ${MAX_MATCH_SCORE}.`);
  }
  if (requiresProgressionPick(match, pick) && !pick.progressingTeamId) {
    errors.push('Draw selected — choose the team that progresses.');
  }
  if (pick.progressingTeamId) {
    const validIds = [match.homeTeamId, match.awayTeamId];
    if (!validIds.includes(pick.progressingTeamId)) {
      errors.push('Progressing team must be one of the teams in this fixture.');
    }
  }
  return errors;
}

export function validateBonusPick(bonus: TournamentBonusPick): string[] {
  const errors: string[] = [];
  const slots: { key: keyof TournamentBonusPick; label: string }[] = [
    { key: 'winnerTeamId', label: 'Winner' },
    { key: 'runnerUpTeamId', label: 'Runner-up' },
    { key: 'thirdTeamId', label: 'Third place' },
    { key: 'fourthTeamId', label: 'Fourth place' }
  ];
  for (const { key, label } of slots) {
    const id = bonus[key];
    if (!VALID_TEAM_IDS.has(id)) {
      errors.push(`${label}: unknown team.`);
    }
  }
  return errors;
}

export function lockableKnockoutMatchIds(
  nowIso = new Date().toISOString(),
  picks: Record<string, Pick> = {},
  actuals: Record<string, ActualResult> = {}
): string[] {
  const matches = getMatches(picks, actuals);
  return matches
    .filter((m) => isKnockout(m) && predictionLockReached(m.kickoff, nowIso))
    .map((m) => m.id);
}

export function affectedFutureMatches(changedMatchId: string): string[] {
  if (changedMatchId.startsWith('g-')) {
    return getMatches()
      .filter((m) => isKnockout(m))
      .map((m) => m.id);
  }
  return getDownstreamKnockoutMatchIds(changedMatchId);
}

export { computeGroupPositions, computeGroupStandings, type GroupRow } from './groupStandings';

export function computeScore(
  picks: Record<string, Pick>,
  actuals: Record<string, ActualResult>,
  bonusPicks: TournamentBonusPick | undefined,
  finalPlacings: TournamentBonusPick | undefined
): {
  points: number;
  correctResultPoints: number;
  exactScorePoints: number;
  groupPositionPoints: number;
  bonusPoints: number;
  exactScores: number;
  correctResults: number;
  exactGroupPositions: number;
  bonusHits: number;
} {
  let points = 0;
  let correctResultPoints = 0;
  let exactScorePoints = 0;
  let exactScores = 0;
  let correctResults = 0;

  const resultKey = (h: number, a: number): 'H' | 'A' | 'D' => (h > a ? 'H' : h < a ? 'A' : 'D');
  const matchesById = Object.fromEntries(getMatches(picks, actuals).map((m) => [m.id, m]));

  Object.values(actuals).forEach((actual) => {
    const pick = picks[actual.matchId];
    if (!pick) return;

    const stage = matchesById[actual.matchId]?.stage ?? 'GROUP';
    const correctResult =
      resultKey(pick.homeScore, pick.awayScore) === resultKey(actual.homeScore, actual.awayScore);
    const exactScore = pick.homeScore === actual.homeScore && pick.awayScore === actual.awayScore;
    const scaled = scaledMatchPointsForStage(stage, { correctResult, exactScore });

    if (scaled.resultPoints > 0) {
      correctResultPoints += scaled.resultPoints;
      points += scaled.resultPoints;
      correctResults += 1;
    }

    if (scaled.exactBonusPoints > 0) {
      exactScorePoints += scaled.exactBonusPoints;
      points += scaled.exactBonusPoints;
      exactScores += 1;
    }
  });

  let groupPositionPoints = 0;
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
        groupPositionPoints += 1;
        points += 1;
      }
    });
  });

  let bonusPoints = 0;
  let bonusHits = 0;
  if (bonusPicks && finalPlacings) {
    if (bonusPicks.winnerTeamId === finalPlacings.winnerTeamId) {
      bonusPoints += 6;
      points += 6;
      bonusHits += 1;
    }
    if (bonusPicks.runnerUpTeamId === finalPlacings.runnerUpTeamId) {
      bonusPoints += 5;
      points += 5;
      bonusHits += 1;
    }
    if (bonusPicks.thirdTeamId === finalPlacings.thirdTeamId) {
      bonusPoints += 4;
      points += 4;
      bonusHits += 1;
    }
    if (bonusPicks.fourthTeamId === finalPlacings.fourthTeamId) {
      bonusPoints += 3;
      points += 3;
      bonusHits += 1;
    }
  }

  return {
    points,
    correctResultPoints,
    exactScorePoints,
    groupPositionPoints,
    bonusPoints,
    exactScores,
    correctResults,
    exactGroupPositions,
    bonusHits
  };
}
