import { teams } from '../data/tournament';
import { formatFixtureStageLabel } from './fixtureLabels';
import {
  ActualResult,
  CrowdStatCard,
  CrowdStatVisualType,
  Match,
  Stage,
  StatisticsPickCount
} from '../types';
import { isUpcomingFixture } from './comparisonVisibility';
import {
  computeLadderSwingCandidates,
  computePinnedLadderSwing,
  computeRankClusterBattles,
  computePointsOnTheLine,
  computeTightestRankCluster,
  computeMostVolatileFixture
} from './leagueImpact';
import { ladderCandidateToCard } from './personalStats';
import {
  buildMysteryStatPool,
  computeFunFacts,
  computeGroupConsensus,
  computeHeadlines,
  computeTournamentOutlook,
  GroupConsensusItem,
  MatchConsensusItem,
  MatchPickInput,
  UserPicks
} from './predictionStats';

export const CROWD_STATS_COUNT = 6;
export const CROWD_STATS_MIN = CROWD_STATS_COUNT;
export const CROWD_STATS_MAX = CROWD_STATS_COUNT;

export const VISUAL_TYPE_ORDER: CrowdStatVisualType[] = [
  'personal',
  'ladder',
  'hero',
  'fixture',
  'standings',
  'podium',
  'volatile',
  'cluster',
  'insight'
];

export interface CrowdStatPoolInput {
  matches: Match[];
  userPicks: UserPicks[];
  viewableUpcomingMatchIds: Set<string>;
  allViewablePicks: MatchPickInput[];
  matchConsensus: MatchConsensusItem[];
  groupPhaseLocked: boolean;
  results: Record<string, ActualResult>;
  includeBaldStat?: boolean;
  currentUserId?: string;
}

export interface CrowdStatPoolOptions {
  revealNames?: boolean;
}

export interface SampleCrowdStatsOptions {
  shuffle?: boolean;
  pinnedHeadToHead?: CrowdStatCard;
  pinnedLadder?: CrowdStatCard;
  remainingPersonal?: CrowdStatCard[];
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

function factSubtitleForText(text: string, icon: string): string {
  if (
    text.includes('end in a draw') ||
    text.includes('clean sheet') ||
    text.includes('Average predicted goals')
  ) {
    return 'League trends';
  }
  if (text.includes('goal fest')) return 'Goal fest alert';
  if (text.includes('strongest consensus') || text.includes('most unpredictable'))
    return 'Group watch';
  if (text.includes('runaway champion')) return 'Tournament outlook';
  if (text.includes('Only ') && text.includes('predicted a unique')) return 'Against the grain';
  if (icon === '🤝' || icon === '🧤' || icon === '⚽') return 'League trends';
  return 'League trends';
}

function shuffleItems<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
    const modalOrder = strongest.modalOrder.map((teamId) => {
      const team = teams.find((t) => t.id === teamId);
      return revealNames
        ? (team?.name ?? teamId)
        : `Pick ${strongest.modalOrder.indexOf(teamId) + 1}`;
    });
    cards.push({
      id: `group-strong-${strongest.groupId}`,
      visualType: 'standings',
      kind: 'group',
      variant: 'consensus',
      groupId: strongest.groupId,
      modalPct: strongest.modalPct,
      modalCount: strongest.modalCount,
      distinctWinners: strongest.distinctWinners,
      modalOrder,
      modalOrderTeamIds: strongest.modalOrder,
      positions: strongest.positionPopularity.map((slot) => ({
        rank: slot.rank,
        teams: revealNames ? slot.teams.slice(0, 2) : anonymizePickCounts(slot.teams.slice(0, 2))
      }))
    });
  }

  const divided = [...groupConsensus]
    .filter((g) => g.distinctWinners >= 2)
    .sort((a, b) => b.distinctWinners - a.distinctWinners)[0];
  if (divided && divided.groupId !== strongest?.groupId) {
    cards.push({
      id: `group-chaos-${divided.groupId}`,
      visualType: 'standings',
      kind: 'group',
      variant: 'divided',
      groupId: divided.groupId,
      modalPct: divided.modalPct,
      modalCount: divided.modalCount,
      distinctWinners: divided.distinctWinners,
      positions: divided.positionPopularity.map((slot) => ({
        rank: slot.rank,
        teams: revealNames ? slot.teams.slice(0, 3) : anonymizePickCounts(slot.teams.slice(0, 3))
      }))
    });
  }

  return cards;
}

function buildFixtureInsightCards(
  matches: Match[],
  matchConsensus: MatchConsensusItem[],
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  viewableUpcomingMatchIds: Set<string>,
  revealNames: boolean
): CrowdStatCard[] {
  const cards: CrowdStatCard[] = [];
  const upcoming = matches
    .filter((match) => viewableUpcomingMatchIds.has(match.id))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  const nextMatch = upcoming[0];
  if (nextMatch) {
    const consensus = matchConsensus.find((item) => item.matchId === nextMatch.id);
    if (consensus && consensus.topScorelines[0]) {
      const top = consensus.topScorelines[0];
      cards.push({
        id: `insight-next-up-${nextMatch.id}`,
        visualType: 'insight',
        kind: 'fact',
        icon: '⏱️',
        subtitle: 'Next up',
        text: revealNames
          ? `Next up: ${fixtureLabel(nextMatch.homeTeamId, nextMatch.awayTeamId, true)} — crowd favourite ${top.label} (${top.pct}%).`
          : `Next up: an upcoming fixture — crowd favourite scoreline lands ${top.pct}% of the time.`
      });
    }
  }

  const splitFixture = [...matchConsensus].sort(
    (a, b) => b.distinctScorelines - a.distinctScorelines || b.totalPicks - a.totalPicks
  )[0];
  if (splitFixture && splitFixture.distinctScorelines >= 3) {
    cards.push({
      id: `insight-split-${splitFixture.matchId}`,
      visualType: 'insight',
      kind: 'fact',
      icon: '🔀',
      subtitle: 'Split opinions',
      text: revealNames
        ? `${fixtureLabel(splitFixture.homeTeamId, splitFixture.awayTeamId, true)} is the most divided upcoming pick — ${splitFixture.distinctScorelines} different scorelines.`
        : `The most divided upcoming fixture has ${splitFixture.distinctScorelines} different predicted scorelines.`
    });
  }

  for (const match of upcoming.slice(0, 3)) {
    const consensus = matchConsensus.find((item) => item.matchId === match.id);
    if (!consensus?.topScorelines[0]) continue;
    const modal = consensus.topScorelines[0];
    const points = computePointsOnTheLine(match, userPicks, modal.label);
    if (points <= 0) continue;
    cards.push({
      id: `insight-points-${match.id}`,
      visualType: 'insight',
      kind: 'fact',
      icon: '💰',
      subtitle: 'Points at stake',
      text: revealNames
        ? `If ${fixtureLabel(match.homeTeamId, match.awayTeamId, true)} ends ${modal.label}, ${points} match points are on the line.`
        : `If the modal upcoming scoreline lands, ${points} match points are on the line.`
    });
    break;
  }

  const battles = computeRankClusterBattles(matches, userPicks, results, viewableUpcomingMatchIds);
  for (const battle of battles.slice(0, 1)) {
    cards.push({
      id: `battle-${battle.match.id}-${battle.playerA}-${battle.playerB}`,
      visualType: 'insight',
      kind: 'battle',
      matchId: battle.match.id,
      stage: battle.match.stage,
      group: battle.match.group,
      homeTeamId: battle.match.homeTeamId,
      awayTeamId: battle.match.awayTeamId,
      playerA: battle.playerA,
      playerB: battle.playerB,
      rankA: battle.rankA,
      rankB: battle.rankB,
      pickA: battle.pickALabel,
      pickB: battle.pickBLabel
    });
  }

  return cards;
}

export function buildPinnedLadderCard(
  matches: Match[],
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  matchConsensus: MatchConsensusItem[],
  viewableUpcomingMatchIds: Set<string>
): CrowdStatCard | undefined {
  const pinned = computePinnedLadderSwing(
    matches,
    userPicks,
    results,
    matchConsensus,
    viewableUpcomingMatchIds
  );
  if (!pinned) return undefined;
  return ladderCandidateToCard(pinned, true);
}

/** @deprecated Use buildPinnedLadderCard */
export function buildPinnedLadderCards(
  matches: Match[],
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  matchConsensus: MatchConsensusItem[],
  viewableUpcomingMatchIds: Set<string>
): CrowdStatCard[] {
  const card = buildPinnedLadderCard(
    matches,
    userPicks,
    results,
    matchConsensus,
    viewableUpcomingMatchIds
  );
  return card ? [card] : [];
}

/** Build the full crowd-stat candidate pool from computed prediction data. */
export function buildCrowdStatPool(
  input: CrowdStatPoolInput,
  options: CrowdStatPoolOptions = {}
): CrowdStatCard[] {
  const revealNames = options.revealNames ?? input.groupPhaseLocked;
  const pool: CrowdStatCard[] = [];
  const {
    matches,
    userPicks,
    matchConsensus,
    allViewablePicks,
    groupPhaseLocked,
    results,
    viewableUpcomingMatchIds
  } = input;

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
      visualType: 'hero',
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
      visualType: 'hero',
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
      visualType: 'hero',
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
        visualType: 'fixture',
        kind: 'match',
        matchId: match.matchId,
        stage: match.stage,
        group: match.group,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        totalPicks: match.totalPicks,
        topScorelines: match.topScorelines
      });
    }

    const ladderCandidates = computeLadderSwingCandidates(
      matches,
      userPicks,
      results,
      matchConsensus,
      viewableUpcomingMatchIds
    );
    for (const candidate of ladderCandidates.slice(0, 8)) {
      pool.push({
        id: `ladder-${candidate.matchId}-${candidate.scoreline}`,
        visualType: 'ladder',
        kind: 'ladder',
        matchId: candidate.matchId,
        stage: candidate.stage,
        group: candidate.group,
        homeTeamId: candidate.homeTeamId,
        awayTeamId: candidate.awayTeamId,
        scoreline: candidate.scoreline,
        scorelinePct: candidate.scorelinePct,
        movers: candidate.movers
      });
    }

    pool.push(
      ...buildFixtureInsightCards(
        matches,
        matchConsensus,
        userPicks,
        results,
        viewableUpcomingMatchIds,
        revealNames
      )
    );

    const volatile = computeMostVolatileFixture(
      matches,
      userPicks,
      results,
      matchConsensus,
      viewableUpcomingMatchIds
    );
    if (volatile) {
      pool.push({
        id: `volatile-${volatile.candidate.matchId}`,
        visualType: 'volatile',
        kind: 'volatile',
        subtitle: 'Most volatile fixture',
        matchId: volatile.candidate.matchId,
        stage: volatile.candidate.stage,
        group: volatile.candidate.group,
        homeTeamId: volatile.candidate.homeTeamId,
        awayTeamId: volatile.candidate.awayTeamId,
        scoreline: volatile.candidate.scoreline,
        scorelinePct: volatile.candidate.scorelinePct,
        ranksMoved: volatile.ranksMoved,
        maxSwing: volatile.candidate.maxSwing
      });
    }
  }

  const cluster = computeTightestRankCluster(userPicks, results, input.currentUserId);
  if (cluster) {
    pool.push({
      id: `cluster-${cluster.players.map((p) => p.userId).join('-')}`,
      visualType: 'cluster',
      kind: 'cluster',
      subtitle: 'Neck and neck',
      players: cluster.players,
      pointSpread: cluster.pointSpread
    });
  }

  for (const fact of funFacts) {
    const subtitle = factSubtitleForText(fact.text, fact.icon);
    pool.push({
      id: `fact-${fact.icon}-${fact.text.slice(0, 24)}`,
      visualType: 'insight',
      kind: 'fact',
      icon: fact.icon,
      subtitle,
      text: revealNames ? fact.text : stripTeamNamesFromText(fact.text)
    });
  }

  if (!groupPhaseLocked) {
    const mysteryFacts = buildMysteryStatPool(userPicks, {
      includeBaldStat: input.includeBaldStat
    });
    for (const stat of mysteryFacts) {
      const id = `mystery-${stat.icon}-${stat.text.slice(0, 24)}`;
      if (!pool.some((c) => c.kind === 'fact' && c.text === stat.text)) {
        pool.push({
          id,
          visualType: 'insight',
          kind: 'fact',
          icon: stat.icon,
          subtitle: 'Sneak peek',
          text: stat.text
        });
      }
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
      visualType: 'podium',
      kind: 'outlook',
      slot,
      picks: revealNames ? picks.slice(0, 3) : anonymizePickCounts(picks.slice(0, 3))
    });
  }

  if (tournamentOutlook.darkHorse) {
    const { playerName } = tournamentOutlook.darkHorse;
    pool.push({
      id: 'spotlight-dark-horse',
      visualType: 'insight',
      kind: 'spotlight',
      icon: '🦄',
      subtitle: 'Against the grain',
      text: revealNames
        ? `Only ${playerName} picked a lone-wolf champion.`
        : `Only ${playerName} picked a unique champion choice.`
    });
  }

  return pool;
}

/** Sample exactly six cards: pinned head to head, pinned ladder, then four from pool. */
export function sampleCrowdStats(
  pool: CrowdStatCard[],
  options: SampleCrowdStatsOptions = {}
): CrowdStatCard[] {
  const pinnedHeadToHead = options.pinnedHeadToHead;
  const pinnedLadder = options.pinnedLadder;
  const remainingPersonal = options.remainingPersonal ?? [];
  const pinnedIds = new Set(
    [pinnedHeadToHead?.id, pinnedLadder?.id].filter((id): id is string => Boolean(id))
  );

  const poolExcludingPinned = pool.filter((card) => !pinnedIds.has(card.id));
  const crowdOnly = poolExcludingPinned.filter(
    (card) => card.visualType !== 'ladder' && card.visualType !== 'personal'
  );
  const personalMix = remainingPersonal.filter((card) => !pinnedIds.has(card.id));
  const shufflePool = [...personalMix, ...crowdOnly];

  const pinnedCount = (pinnedHeadToHead ? 1 : 0) + (pinnedLadder ? 1 : 0);
  const sampleSlots = Math.max(0, CROWD_STATS_COUNT - pinnedCount);

  if (options.shuffle === false) {
    const remainder = shufflePool.slice(0, sampleSlots);
    return [pinnedHeadToHead, pinnedLadder, ...remainder]
      .filter((card): card is CrowdStatCard => card !== undefined)
      .slice(0, CROWD_STATS_COUNT);
  }

  const byVisual = new Map<CrowdStatVisualType, CrowdStatCard[]>();
  for (const card of shufflePool) {
    const list = byVisual.get(card.visualType) ?? [];
    list.push(card);
    byVisual.set(card.visualType, list);
  }

  const selected: CrowdStatCard[] = [];
  const usedIds = new Set<string>();

  const sampleOrder = VISUAL_TYPE_ORDER.filter((type) => type !== 'ladder');

  for (const visualType of sampleOrder) {
    const candidates = shuffleItems(byVisual.get(visualType) ?? []).filter(
      (card) => !usedIds.has(card.id)
    );
    if (candidates.length === 0) continue;
    selected.push(candidates[0]);
    usedIds.add(candidates[0].id);
  }

  const remaining = shuffleItems(shufflePool.filter((card) => !usedIds.has(card.id)));
  for (const card of remaining) {
    if (selected.length >= sampleSlots) break;
    selected.push(card);
    usedIds.add(card.id);
  }

  const ordered = sampleOrder
    .map((visualType) => selected.find((card) => card.visualType === visualType))
    .filter((card): card is CrowdStatCard => card !== undefined);
  const extras = selected.filter((card) => !ordered.includes(card));

  const combined = [pinnedHeadToHead, pinnedLadder, ...ordered, ...extras].filter(
    (card): card is CrowdStatCard => card !== undefined
  );

  if (combined.length < CROWD_STATS_COUNT) {
    const insightPool = shuffleItems(
      shufflePool.filter(
        (card) =>
          card.visualType === 'insight' && !combined.some((existing) => existing.id === card.id)
      )
    );
    for (const card of insightPool) {
      if (combined.length >= CROWD_STATS_COUNT) break;
      combined.push(card);
    }
  }

  return combined.slice(0, CROWD_STATS_COUNT);
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
