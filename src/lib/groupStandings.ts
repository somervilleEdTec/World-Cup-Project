import { fifaWorldRankJune2026 } from '../data/fifaWorldRankingJune2026';
import { groupMatches, teams } from '../data/tournament';
import { Match, Pick as MatchPick } from '../types';

export interface StandingsOptions {
  /** Cumulative fair-play points per team (higher is better). Defaults to 0. */
  fairPlayByTeam?: Record<string, number>;
}

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

function applyMiniLeagueResult(
  home: MiniLeagueRow,
  away: MiniLeagueRow,
  homeScore: number,
  awayScore: number
): void {
  home.gf += homeScore;
  away.gf += awayScore;
  home.gd += homeScore - awayScore;
  away.gd += awayScore - homeScore;

  if (homeScore > awayScore) {
    home.pts += 3;
  } else if (homeScore < awayScore) {
    away.pts += 3;
  } else {
    home.pts += 1;
    away.pts += 1;
  }
}

function applyGroupResult(home: GroupRow, away: GroupRow, homeScore: number, awayScore: number): void {
  home.gf += homeScore;
  away.gf += awayScore;
  home.ga += awayScore;
  away.ga += homeScore;
  home.gd += homeScore - awayScore;
  away.gd += awayScore - homeScore;

  if (homeScore > awayScore) {
    home.pts += 3;
    home.w += 1;
    away.l += 1;
  } else if (homeScore < awayScore) {
    away.pts += 3;
    away.w += 1;
    home.l += 1;
  } else {
    home.pts += 1;
    away.pts += 1;
    home.d += 1;
    away.d += 1;
  }
}

function computeMiniLeague(
  teamIds: ReadonlySet<string>,
  picks: Record<string, MatchPick>,
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

    applyMiniLeagueResult(home, away, pick.homeScore, pick.awayScore);
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

function fairPlayScore(teamId: string, options?: StandingsOptions): number {
  return options?.fairPlayByTeam?.[teamId] ?? 0;
}

function fifaRankKey(teamId: string): number {
  return 1000 - fifaWorldRankJune2026(teamId);
}

/**
 * FIFA World Cup 2026 group ranking for teams tied on points.
 * Step one: head-to-head mini-league (pts, gd, gf).
 * Step two: overall group gd, gf.
 * Step three: fair play (team conduct), then June 2026 FIFA world ranking, then stable team id.
 */
function resolveTiedGroup(
  tied: GroupRow[],
  picks: Record<string, MatchPick>,
  matches: Match[],
  options?: StandingsOptions
): GroupRow[] {
  if (tied.length <= 1) return tied;

  const teamIds = new Set(tied.map((row) => row.teamId));
  const mini = computeMiniLeague(teamIds, picks, matches);

  const byMiniPts = splitByDistinctGroups(tied, (row) => mini.get(row.teamId)!.pts);
  if (byMiniPts.length > 1) {
    return byMiniPts.flatMap((group) => resolveTiedGroup(group, picks, matches, options));
  }

  const byMiniGd = splitByDistinctGroups(tied, (row) => mini.get(row.teamId)!.gd);
  if (byMiniGd.length > 1) {
    return byMiniGd.flatMap((group) => resolveTiedGroup(group, picks, matches, options));
  }

  const byMiniGf = splitByDistinctGroups(tied, (row) => mini.get(row.teamId)!.gf);
  if (byMiniGf.length > 1) {
    return byMiniGf.flatMap((group) => resolveTiedGroup(group, picks, matches, options));
  }

  const byOverallGd = splitByDistinctGroups(tied, (row) => row.gd);
  if (byOverallGd.length > 1) {
    return byOverallGd.flatMap((group) => resolveTiedGroup(group, picks, matches, options));
  }

  const byOverallGf = splitByDistinctGroups(tied, (row) => row.gf);
  if (byOverallGf.length > 1) {
    return byOverallGf.flatMap((group) => resolveTiedGroup(group, picks, matches, options));
  }

  const byFairPlay = splitByDistinctGroups(tied, (row) => fairPlayScore(row.teamId, options));
  if (byFairPlay.length > 1) {
    return byFairPlay.flatMap((group) => resolveTiedGroup(group, picks, matches, options));
  }

  const byFifaRank = splitByDistinctGroups(tied, (row) => fifaRankKey(row.teamId));
  if (byFifaRank.length > 1) {
    return byFifaRank.flatMap((group) => resolveTiedGroup(group, picks, matches, options));
  }

  return [...tied].sort((a, b) => a.teamId.localeCompare(b.teamId));
}

function rankGroupRows(
  rows: GroupRow[],
  picks: Record<string, MatchPick>,
  matches: Match[],
  options?: StandingsOptions
): GroupRow[] {
  const byPoints = splitByDistinctGroups(rows, (row) => row.pts);
  return byPoints.flatMap((group) =>
    group.length === 1 ? group : resolveTiedGroup(group, picks, matches, options)
  );
}

interface ThirdPlaceStats {
  teamId: string;
  pts: number;
  gd: number;
  gf: number;
}

/** Compare third-placed teams from different groups (no head-to-head between groups). */
export function compareThirdPlaceStats(
  a: ThirdPlaceStats,
  b: ThirdPlaceStats,
  options?: StandingsOptions
): number {
  const fairPlay = (teamId: string) => options?.fairPlayByTeam?.[teamId] ?? 0;
  return (
    b.pts - a.pts ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    fairPlay(b.teamId) - fairPlay(a.teamId) ||
    fifaWorldRankJune2026(a.teamId) - fifaWorldRankJune2026(b.teamId) ||
    a.teamId.localeCompare(b.teamId)
  );
}

export function computeGroupStandings(
  groupId: string,
  picks: Record<string, MatchPick>,
  options?: StandingsOptions
): GroupRow[] {
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
    applyGroupResult(home, away, pick.homeScore, pick.awayScore);
  });

  return rankGroupRows([...rows.values()], picks, matchesInGroup, options);
}

export function computeGroupPositions(
  groupId: string,
  picks: Record<string, MatchPick>,
  options?: StandingsOptions
): string[] {
  return computeGroupStandings(groupId, picks, options).map((row) => row.teamId);
}
