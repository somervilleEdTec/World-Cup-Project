import { groupMatches, teams } from '../data/tournament';
import { Match, Pick } from '../types';

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

interface MiniLeagueRow {
  pts: number;
  gd: number;
  gf: number;
}

function applyResult(
  home: GroupRow | MiniLeagueRow,
  away: GroupRow | MiniLeagueRow,
  homeScore: number,
  awayScore: number
): void {
  home.gf += homeScore;
  away.gf += awayScore;
  if ('ga' in home) {
    home.ga += awayScore;
    away.ga += homeScore;
  }
  home.gd += homeScore - awayScore;
  away.gd += awayScore - homeScore;

  if (homeScore > awayScore) {
    home.pts += 3;
    if ('w' in home) {
      home.w += 1;
      away.l += 1;
    }
  } else if (homeScore < awayScore) {
    away.pts += 3;
    if ('w' in away) {
      away.w += 1;
      home.l += 1;
    }
  } else {
    home.pts += 1;
    away.pts += 1;
    if ('d' in home) {
      home.d += 1;
      away.d += 1;
    }
  }
}

function computeMiniLeague(
  teamIds: ReadonlySet<string>,
  picks: Record<string, Pick>,
  matches: Match[]
): Map<string, MiniLeagueRow> {
  const rows = new Map<string, MiniLeagueRow>();
  teamIds.forEach((teamId) => rows.set(teamId, { pts: 0, gd: 0, gf: 0 }));

  matches.forEach((match) => {
    if (!teamIds.has(match.homeTeamId) || !teamIds.has(match.awayTeamId)) return;
    const pick = picks[match.id];
    if (!pick || pick.homeScore < 0 || pick.awayScore < 0) return;

    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) return;

    applyResult(home, away, pick.homeScore, pick.awayScore);
  });

  return rows;
}

function splitByDistinctGroups<T>(items: T[], key: (item: T) => number): T[][] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => key(b) - key(a));
  const groups: T[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i += 1) {
    const group = groups[groups.length - 1];
    if (key(sorted[i]) === key(group[0]!)) {
      group.push(sorted[i]!);
    } else {
      groups.push([sorted[i]!]);
    }
  }
  return groups;
}

/** FIFA group ranking for teams tied on points (steps 2–6, then deterministic draw). */
function resolveTiedGroup(
  tied: GroupRow[],
  picks: Record<string, Pick>,
  matches: Match[]
): GroupRow[] {
  if (tied.length <= 1) return tied;

  const byOverallGd = splitByDistinctGroups(tied, (row) => row.gd);
  if (byOverallGd.length > 1) {
    return byOverallGd.flatMap((group) => resolveTiedGroup(group, picks, matches));
  }

  const byOverallGf = splitByDistinctGroups(tied, (row) => row.gf);
  if (byOverallGf.length > 1) {
    return byOverallGf.flatMap((group) => resolveTiedGroup(group, picks, matches));
  }

  const teamIds = new Set(tied.map((row) => row.teamId));
  const mini = computeMiniLeague(teamIds, picks, matches);

  const byMiniPts = splitByDistinctGroups(tied, (row) => mini.get(row.teamId)!.pts);
  if (byMiniPts.length > 1) {
    return byMiniPts.flatMap((group) => resolveTiedGroup(group, picks, matches));
  }

  const byMiniGd = splitByDistinctGroups(tied, (row) => mini.get(row.teamId)!.gd);
  if (byMiniGd.length > 1) {
    return byMiniGd.flatMap((group) => resolveTiedGroup(group, picks, matches));
  }

  const byMiniGf = splitByDistinctGroups(tied, (row) => mini.get(row.teamId)!.gf);
  if (byMiniGf.length > 1) {
    return byMiniGf.flatMap((group) => resolveTiedGroup(group, picks, matches));
  }

  // Fair-play points are not tracked; use stable team id as draw-of-lots stand-in.
  return [...tied].sort((a, b) => a.teamId.localeCompare(b.teamId));
}

function rankGroupRows(rows: GroupRow[], picks: Record<string, Pick>, matches: Match[]): GroupRow[] {
  const byPoints = splitByDistinctGroups(rows, (row) => row.pts);
  return byPoints.flatMap((group) =>
    group.length === 1 ? group : resolveTiedGroup(group, picks, matches)
  );
}

/** Compare third-placed teams from different groups (no head-to-head between groups). */
export function compareThirdPlaceStats(
  a: Pick<GroupRow, 'pts' | 'gd' | 'gf' | 'teamId'>,
  b: Pick<GroupRow, 'pts' | 'gd' | 'gf' | 'teamId'>
): number {
  return (
    b.pts - a.pts ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.teamId.localeCompare(b.teamId)
  );
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
    if (!pick || pick.homeScore < 0 || pick.awayScore < 0) return;
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) return;

    home.gp += 1;
    away.gp += 1;
    applyResult(home, away, pick.homeScore, pick.awayScore);
  });

  return rankGroupRows([...rows.values()], picks, matchesInGroup);
}

export function computeGroupPositions(groupId: string, picks: Record<string, Pick>): string[] {
  return computeGroupStandings(groupId, picks).map((row) => row.teamId);
}
