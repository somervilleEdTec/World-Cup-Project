import { WORLD_CUP_DISCIPLINE_SNAPSHOT } from '../data/worldCupDiscipline2026';
import { groupMatches } from '../data/tournament';
import { ActualResult, MatchDiscipline, Pick, TeamDiscipline } from '../types';
import type { StandingsOptions } from './groupStandings';

/** FIFA fair-play points for one team in one match (higher is better, 0 = clean). */
export function fairPlayPointsFromDiscipline(discipline: TeamDiscipline): number {
  return -(
    discipline.yellowCards +
    3 * discipline.secondYellowReds +
    4 * discipline.directReds
  );
}

export function disciplineForMatch(
  matchId: string,
  results: Record<string, ActualResult>
): MatchDiscipline | undefined {
  const fromResult = results[matchId]?.discipline;
  if (fromResult) return fromResult;
  return WORLD_CUP_DISCIPLINE_SNAPSHOT[matchId];
}

/** Cumulative fair-play score per team from played group matches with known discipline. */
export function computeFairPlayByTeam(
  groupId: string,
  picks: Record<string, Pick>,
  results: Record<string, ActualResult> = {}
): Record<string, number> {
  const totals: Record<string, number> = {};
  const matchesInGroup = groupMatches.filter((m) => m.group === groupId);

  matchesInGroup.forEach((match) => {
    const pick = picks[match.id];
    if (!pick || pick.homeScore < 0 || pick.awayScore < 0) return;

    const discipline = disciplineForMatch(match.id, results);
    if (!discipline) return;

    totals[match.homeTeamId] =
      (totals[match.homeTeamId] ?? 0) + fairPlayPointsFromDiscipline(discipline.home);
    totals[match.awayTeamId] =
      (totals[match.awayTeamId] ?? 0) + fairPlayPointsFromDiscipline(discipline.away);
  });

  return totals;
}

export function computeFairPlayByTeamAllGroups(
  picks: Record<string, Pick>,
  results: Record<string, ActualResult> = {}
): Record<string, number> {
  const groups = [
    ...new Set(
      groupMatches.map((m) => m.group).filter((group): group is string => group !== undefined)
    )
  ];
  return groups.reduce<Record<string, number>>((acc, groupId) => {
    return { ...acc, ...computeFairPlayByTeam(groupId, picks, results) };
  }, {});
}



/** Standings options for official/actual tables — fair play enabled. */
export function actualStandingsOptions(
  picks: Record<string, Pick>,
  results: Record<string, ActualResult> = {}
): StandingsOptions {
  return {
    useFairPlay: true,
    fairPlayByTeam: computeFairPlayByTeamAllGroups(picks, results)
  };
}

/** Standings options for user predictions — fair play skipped, FIFA rank only. */
export function predictedStandingsOptions(): StandingsOptions {
  return { useFairPlay: false };
}
