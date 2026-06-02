import { groupMatches, teams } from '../data/tournament';
import { Pick } from '../types';

export interface GroupRow {
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

export function computeGroupStandings(groupId: string, picks: Record<string, Pick>): GroupRow[] {
  const matchesInGroup = groupMatches.filter((m) => m.group === groupId);
  const rows = new Map<string, GroupRow>();

  teams
    .filter((team) => team.group === groupId)
    .forEach((team) => rows.set(team.id, { teamId: team.id, pts: 0, gd: 0, gf: 0 }));

  matchesInGroup.forEach((match) => {
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

  return [...rows.values()].sort(compareRows);
}

export function computeGroupPositions(groupId: string, picks: Record<string, Pick>): string[] {
  return computeGroupStandings(groupId, picks).map((row) => row.teamId);
}
