import { teams } from '../data/tournament';
import { isUpcomingFixture } from './comparisonVisibility';
import { formatFixtureStageLabel } from './fixtureLabels';
import {
  buildMysteryStatPool,
  computeFunFacts,
  computeGroupConsensus,
  computeHeadlines,
  computeMatchConsensus,
  computeTournamentOutlook,
  GroupConsensusItem,
  MatchConsensusItem,
  MatchPickInput,
  UserPicks
} from './predictionStats';
import { ActualResult, CrowdStatCard, Match, Stage, StatisticsPickCount } from '../types';

export const CROWD_STATS_MIN = 5;
export const CROWD_STATS_MAX = 8;

export interface CrowdStatPoolInput {
  matches: Match[];
  userPicks: UserPicks[];
  viewableUpcomingMatchIds: Set<string>;
  allViewablePicks: MatchPickInput[];
  matchConsensus: MatchConsensusItem[];
  groupPhaseLocked: boolean;
  includeBaldStat?: boolean;
}

export interface CrowdStatPoolOptions {
  revealNames?: boolean;
}

export interface SampleCrowdStatsOptions {
  shuffle?: boolean;
  min?: number;
  max?: number;
}

function anonymizePickCounts(items: StatisticsPickCount[]): StatisticsPickCount[] {
  return items.map((item, index) => ({
    ...item,
    label: `Pick ${index + 1}`
  }));
}

function fixtureLabel(homeTeamId: string, awayTeamId: string, revealNames: boolean): string {
  if (!revealNames) return 'Home vs Away';
  const home = teams.find((t) => t.id === homeTeamId);
  const away = teams.find((t) => t.id === awayTeamId);
  return `${home?.name ?? homeTeamId} vs ${away?.name ?? awayTeamId}`;
}

function anonymizedFixtureDetail(
  stage: Stage,
  group: string | undefined,
  revealNames: boolean
): string {
  if (revealNames) return '';
  return `an upcoming ${formatFixtureStageLabel(stage, group)} match`;
}

function stripTeamNamesFromText(text: string): string {
  let result = text;
  for (const team of teams) {
    result = result.split(team.name).join('a team');
  }
  return result;
}

function shuffleItems<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function groupCardsFromConsensus(
  groupConsensus: GroupConsensusItem[],
  revealNames: boolean
): CrowdStatCard[] {
  const cards: CrowdStatCard[] = [];

  const strongest = [...groupConsensus]
    .filter((g) => g.modalCount > 0)
    .sort((a, b) => b.modalPct - a.modalPct)[0];
  if (strongest) {
    const topWinners = strongest.positionPopularity[0]?.teams.slice(0, 3) ?? [];
    cards.push({
      id: `group-strong-${strongest.groupId}`,
      kind: 'group',
      groupId: strongest.groupId,
      modalPct: strongest.modalPct,
      modalCount: strongest.modalCount,
      distinctWinners: strongest.distinctWinners,
      topWinners: revealNames ? topWinners : anonymizePickCounts(topWinners)
    });
  }

  const divided = [...groupConsensus]
    .filter((g) => g.distinctWinners >= 2)
    .sort((a, b) => b.distinctWinners - a.distinctWinners)[0];
  if (divided && divided.groupId !== strongest?.groupId) {
    const topWinners = divided.positionPopularity[0]?.teams.slice(0, 3) ?? [];
    cards.push({
      id: `group-chaos-${divided.groupId}`,
      kind: 'group',
      groupId: divided.groupId,
      modalPct: divided.modalPct,
      modalCount: divided.modalCount,
      distinctWinners: divided.distinctWinners,
      topWinners: revealNames ? topWinners : anonymizePickCounts(topWinners)
    });
  }

  return cards;
}

/** Build the full crowd-stat candidate pool from computed prediction data. */
export function buildCrowdStatPool(
  input: CrowdStatPoolInput,
  options: CrowdStatPoolOptions = {}
): CrowdStatCard[] {
  const revealNames = options.revealNames ?? input.groupPhaseLocked;
  const pool: CrowdStatCard[] = [];
  const { userPicks, matchConsensus, allViewablePicks, groupPhaseLocked } = input;

  const headlines = computeHeadlines(matchConsensus, allViewablePicks);
  const groupConsensus = computeGroupConsensus(userPicks, true);
  const tournamentOutlook = computeTournamentOutlook(userPicks, true);
  const funFacts = computeFunFacts(
    matchConsensus,
    groupConsensus,
    userPicks,
    allViewablePicks,
    tournamentOutlook
  );

  if (headlines.hiveMind && groupPhaseLocked) {
    const h = headlines.hiveMind;
    const detail = revealNames
      ? `${fixtureLabel(h.homeTeamId, h.awayTeamId, true)} — ${h.count}/${h.total} agree (${h.pct}%)`
      : `${anonymizedFixtureDetail(
          matchConsensus.find((m) => m.matchId === h.matchId)?.stage ?? 'GROUP',
          matchConsensus.find((m) => m.matchId === h.matchId)?.group,
          false
        )} — ${h.count}/${h.total} agree (${h.pct}%)`;
    pool.push({
      id: 'hero-hive-mind',
      kind: 'hero',
      title: 'The Hive Mind',
      value: h.scoreline,
      detail,
      variant: 'consensus'
    });
  }

  if (headlines.roomForDebate && groupPhaseLocked) {
    const r = headlines.roomForDebate;
    const match = matchConsensus.find((m) => m.matchId === r.matchId);
    pool.push({
      id: 'hero-room-for-debate',
      kind: 'hero',
      title: 'Room for Debate',
      value: `${r.distinctScorelines} scorelines`,
      detail: revealNames
        ? fixtureLabel(r.homeTeamId, r.awayTeamId, true)
        : anonymizedFixtureDetail(match?.stage ?? 'GROUP', match?.group, false),
      variant: 'chaos'
    });
  }

  if (headlines.scorelineKing && groupPhaseLocked) {
    const s = headlines.scorelineKing;
    pool.push({
      id: 'hero-scoreline-king',
      kind: 'hero',
      title: 'Scoreline King',
      value: s.scoreline,
      detail: `Predicted ${s.count} time${s.count === 1 ? '' : 's'} across upcoming fixtures`,
      variant: 'default'
    });
  }

  if (groupPhaseLocked) {
    for (const match of matchConsensus) {
      pool.push({
        id: `match-${match.matchId}`,
        kind: 'match',
        matchId: match.matchId,
        stage: match.stage,
        group: match.group,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        totalPicks: match.totalPicks,
        topScorelines: match.topScorelines,
        resultSplit: match.resultSplit
      });
    }
  }

  for (const fact of funFacts) {
    pool.push({
      id: `fact-${fact.icon}-${fact.text.slice(0, 24)}`,
      kind: 'fact',
      icon: fact.icon,
      text: revealNames ? fact.text : stripTeamNamesFromText(fact.text)
    });
  }

  const mysteryFacts = buildMysteryStatPool(userPicks, {
    includeBaldStat: input.includeBaldStat
  });
  for (const stat of mysteryFacts) {
    const id = `mystery-${stat.icon}-${stat.text.slice(0, 24)}`;
    if (!pool.some((c) => c.kind === 'fact' && c.text === stat.text)) {
      pool.push({ id, kind: 'fact', icon: stat.icon, text: stat.text });
    }
  }

  pool.push(...groupCardsFromConsensus(groupConsensus, revealNames));

  const outlookSlots: Array<{
    slot: 'champion' | 'runnerUp' | 'third' | 'fourth';
    picks: StatisticsPickCount[];
  }> = [
    { slot: 'champion', picks: tournamentOutlook.champion },
    { slot: 'runnerUp', picks: tournamentOutlook.runnerUp },
    { slot: 'third', picks: tournamentOutlook.third },
    { slot: 'fourth', picks: tournamentOutlook.fourth }
  ];

  for (const { slot, picks } of outlookSlots) {
    if (picks.length === 0) continue;
    pool.push({
      id: `outlook-${slot}`,
      kind: 'outlook',
      slot,
      picks: revealNames ? picks.slice(0, 3) : anonymizePickCounts(picks.slice(0, 3))
    });
  }

  if (tournamentOutlook.darkHorse) {
    const { playerName } = tournamentOutlook.darkHorse;
    pool.push({
      id: 'spotlight-dark-horse',
      kind: 'spotlight',
      icon: '🦄',
      text: revealNames
        ? `Only ${playerName} picked a lone-wolf champion.`
        : `Only ${playerName} picked a unique champion choice.`
    });
  }

  const playersWithPicks = userPicks.filter((u) => Object.keys(u.picks).length > 0).length;
  if (playersWithPicks > 0 && !groupPhaseLocked) {
    pool.push({
      id: 'fact-players-submitted',
      kind: 'fact',
      icon: '🔒',
      text: `${playersWithPicks} player${playersWithPicks === 1 ? '' : 's'} have submitted picks — full crowd stats unlock after the first kickoff.`
    });
  }

  return pool;
}

/** Stratified random sample of 5–8 cards from the pool. */
export function sampleCrowdStats(
  pool: CrowdStatCard[],
  options: SampleCrowdStatsOptions = {}
): CrowdStatCard[] {
  if (pool.length === 0) return [];

  const min = options.min ?? CROWD_STATS_MIN;
  const max = options.max ?? CROWD_STATS_MAX;
  const target = options.shuffle === false ? min : randomInt(min, max);
  const cappedTarget = Math.min(target, pool.length);

  if (options.shuffle === false) {
    return pool.slice(0, cappedTarget);
  }

  const byKind = new Map<CrowdStatCard['kind'], CrowdStatCard[]>();
  for (const card of pool) {
    const list = byKind.get(card.kind) ?? [];
    list.push(card);
    byKind.set(card.kind, list);
  }

  const selected: CrowdStatCard[] = [];
  const usedIds = new Set<string>();

  function pickOne(kind: CrowdStatCard['kind']): void {
    const candidates = shuffleItems(byKind.get(kind) ?? []).filter((c) => !usedIds.has(c.id));
    if (candidates.length === 0) return;
    selected.push(candidates[0]);
    usedIds.add(candidates[0].id);
  }

  pickOne('hero');
  pickOne('match');
  pickOne('fact');

  const remaining = shuffleItems(pool.filter((c) => !usedIds.has(c.id)));
  for (const card of remaining) {
    if (selected.length >= cappedTarget) break;
    selected.push(card);
    usedIds.add(card.id);
  }

  return shuffleItems(selected);
}

export function collectViewablePicks(
  matches: Match[],
  userPicks: UserPicks[],
  viewableMatchIds: Set<string>
): MatchPickInput[] {
  const picks: MatchPickInput[] = [];
  for (const match of matches) {
    if (!viewableMatchIds.has(match.id)) continue;
    for (const user of userPicks) {
      const pick = user.picks[match.id];
      if (!pick || pick.homeScore < 0 || pick.awayScore < 0) continue;
      picks.push({
        matchId: match.id,
        stage: match.stage,
        group: match.group,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        pick,
        userId: user.userId,
        displayName: user.displayName
      });
    }
  }
  return picks;
}

export function countUpcomingFixtures(
  matches: Match[],
  nowIso: string,
  results: Record<string, ActualResult>
): number {
  return matches.filter((m) => isUpcomingFixture(m, nowIso, results)).length;
}
