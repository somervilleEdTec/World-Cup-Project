import { groupMatches, teams } from '../data/tournament';
import { Pick } from '../types';

export interface GroupRow {
  teamId: string;
  gp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
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
    .forEach((team) =>
      rows.set(team.id, { teamId: team.id, gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 })
    );

  matchesInGroup.forEach((match) => {
    const pick = picks[match.id];
    if (!pick) return;
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) return;

    home.gp += 1;
    away.gp += 1;
    home.gf += pick.homeScore;
    away.gf += pick.awayScore;
    home.ga += pick.awayScore;
    away.ga += pick.homeScore;
    home.gd += pick.homeScore - pick.awayScore;
    away.gd += pick.awayScore - pick.homeScore;

    if (pick.homeScore > pick.awayScore) {
      home.pts += 3;
      home.w += 1;
      away.l += 1;
    } else if (pick.homeScore < pick.awayScore) {
      away.pts += 3;
      away.w += 1;
      home.l += 1;
    } else {
      home.pts += 1;
      away.pts += 1;
      home.d += 1;
      away.d += 1;
    }
  });

  return [...rows.values()].sort(compareRows);
}

export function computeGroupPositions(groupId: string, picks: Record<string, Pick>): string[] {
  return computeGroupStandings(groupId, picks).map((row) => row.teamId);
}
