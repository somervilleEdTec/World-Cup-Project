import { FIRST_MATCH_KICKOFF, matches, teams } from '../data/tournament';
import { ActualResult, Match, Pick, TournamentBonusPick } from '../types';

const KO_STAGES = new Set(['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL']);

export function isGroupStage(match: Match): boolean {
  return match.stage === 'GROUP';
}

export function isKnockout(match: Match): boolean {
  return KO_STAGES.has(match.stage);
}

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

export function kickoffReached(isoKickoff: string, nowIso = new Date().toISOString()): boolean {
  return new Date(nowIso).getTime() >= new Date(isoKickoff).getTime();
}

export function shouldLockGroup(nowIso = new Date().toISOString()): boolean {
  return kickoffReached(FIRST_MATCH_KICKOFF, nowIso);
}

export function lockableKnockoutMatchIds(nowIso = new Date().toISOString()): string[] {
  return matches.filter((m) => isKnockout(m) && kickoffReached(m.kickoff, nowIso)).map((m) => m.id);
}

export function affectedFutureMatches(changedMatchId: string): string[] {
  const changed = matches.find((m) => m.id === changedMatchId);
  if (!changed) return [];

  if (changed.stage === 'GROUP') {
    return matches.filter((m) => isKnockout(m)).map((m) => m.id);
  }
  const stageOrder: Match['stage'][] = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];
  const idx = stageOrder.indexOf(changed.stage);
  return matches
    .filter((m) => stageOrder.indexOf(m.stage) > idx)
    .map((m) => m.id);
}

interface GroupRow {
  teamId: string;
  pts: number;
  gd: number;
  gf: number;
}

function compareRows(a: GroupRow, b: GroupRow): number {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.gd !== a.gd) return b.gd - a.gd;
  return b.gf - a.gf;
}

export function computeGroupPositions(groupId: string, picks: Record<string, Pick>): string[] {
  const groupMatches = matches.filter((m) => m.stage === 'GROUP' && m.group === groupId);
  const rows = new Map<string, GroupRow>();

  teams
    .filter((team) => team.group === groupId)
    .forEach((team) => rows.set(team.id, { teamId: team.id, pts: 0, gd: 0, gf: 0 }));

  groupMatches.forEach((match) => {
    const pick = picks[match.id];
    if (!pick) return;
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) return;

    home.gf += pick.homeScore;
    away.gf += pick.awayScore;
    home.gd += pick.homeScore - pick.awayScore;
    away.gd += pick.awayScore - pick.homeScore;

    if (pick.homeScore > pick.awayScore) {
      home.pts += 3;
    } else if (pick.homeScore < pick.awayScore) {
      away.pts += 3;
    } else {
      home.pts += 1;
      away.pts += 1;
    }
  });

  return [...rows.values()].sort(compareRows).map((row) => row.teamId);
}

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
      points += 1;
      correctResults += 1;
    }

    if (pick.homeScore === actual.homeScore && pick.awayScore === actual.awayScore) {
      points += 5;
      exactScores += 1;
    }
  });

  let exactGroupPositions = 0;
  const groups = [...new Set(teams.map((team) => team.group))];
  groups.forEach((groupId) => {
    const predictedPositions = computeGroupPositions(groupId, picks);
    const actualPositions = computeGroupPositions(
      groupId,
      Object.fromEntries(Object.values(actuals).map((result) => [result.matchId, result])) as unknown as Record<string, Pick>
    );
    predictedPositions.forEach((teamId, idx) => {
      if (actualPositions[idx] === teamId) {
        exactGroupPositions += 1;
        points += 2;
      }
    });
  });

  let bonusHits = 0;
  if (bonusPicks && finalPlacings) {
    if (bonusPicks.winnerTeamId === finalPlacings.winnerTeamId) {
      points += 10;
      bonusHits += 1;
    }
    if (bonusPicks.runnerUpTeamId === finalPlacings.runnerUpTeamId) {
      points += 8;
      bonusHits += 1;
    }
    if (bonusPicks.thirdTeamId === finalPlacings.thirdTeamId) {
      points += 6;
      bonusHits += 1;
    }
    if (bonusPicks.fourthTeamId === finalPlacings.fourthTeamId) {
      points += 4;
      bonusHits += 1;
    }
  }

  return { points, exactScores, correctResults, exactGroupPositions, bonusHits };
}
