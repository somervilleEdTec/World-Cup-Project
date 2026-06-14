import { teams, groupMatches } from '../data/tournament';
import { computeGroupPositions } from './groupStandings';
import { evaluateMatchScoring } from './matchScoring';
import {
  computeGroupConsensus,
  formatScorelineLabel,
  GroupConsensusItem,
  MatchConsensusItem,
  pickKey,
  scorelinesForMatch,
  UserPicks
} from './predictionStats';
import { getUpcomingKickoffWindows } from './upcomingFixtures';
import {
  computePinnedLadderSwing,
  LadderSwingCandidate,
  rankPlayersForStats
} from './leagueImpact';
import { ActualResult, CrowdStatCard, Match, PickAlignment } from '../types';

export interface PersonalStatsInput {
  currentUserId: string;
  matches: Match[];
  userPicks: UserPicks[];
  results: Record<string, ActualResult>;
  matchConsensus: MatchConsensusItem[];
  viewableUpcomingMatchIds: Set<string>;
  groupPhaseLocked: boolean;
  revealNames: boolean;
  pinnedLadder?: LadderSwingCandidate | null;
}

function shuffleItems<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function userHasPick(user: UserPicks, matchId: string): boolean {
  const pick = user.picks[matchId];
  return Boolean(pick && pick.homeScore >= 0 && pick.awayScore >= 0);
}

function formatUserPickLabel(match: Match, pick: UserPicks['picks'][string]): string {
  return formatScorelineLabel(pickKey({ ...pick, matchId: match.id }, match.stage, match));
}

function pickAlignment(
  userPick: UserPicks['picks'][string],
  modalLabel: string,
  match: Match
): PickAlignment {
  const userLabel = formatUserPickLabel(match, userPick);
  if (userLabel === modalLabel) return 'exact';
  const simulated = modalLabel.match(/^(\d+)-(\d+)/);
  if (!simulated) return 'bold';
  const actual: ActualResult = {
    matchId: match.id,
    homeScore: Number(simulated[1]),
    awayScore: Number(simulated[2])
  };
  const { correctResult } = evaluateMatchScoring(
    { ...userPick, matchId: match.id },
    actual,
    match.stage,
    match
  );
  return correctResult ? 'result' : 'bold';
}

function upcomingMatchesWithUserPick(input: PersonalStatsInput, user: UserPicks): Match[] {
  return input.matches
    .filter((match) => input.viewableUpcomingMatchIds.has(match.id))
    .filter((match) => userHasPick(user, match.id));
}

function windowMatchesWithUserPick(
  windows: ReturnType<typeof getUpcomingKickoffWindows>,
  user: UserPicks
): Match[] {
  const next = windows.next.filter((m) => userHasPick(user, m.id));
  if (next.length > 0) return next;
  return windows.secondNext.filter((m) => userHasPick(user, m.id));
}

function selectScorelineChips(
  breakdown: ReturnType<typeof scorelinesForMatch>,
  yourPick: string,
  maxVisible = 5
): ReturnType<typeof scorelinesForMatch> {
  const top = breakdown.slice(0, maxVisible);
  const yourEntry = breakdown.find((entry) => entry.label === yourPick);
  if (!yourEntry || top.some((entry) => entry.label === yourPick)) {
    return top;
  }
  return [...top.slice(0, maxVisible - 1), yourEntry];
}

const HIVE_MIND_MIN_MATCHES = 4;

function buildLadderMoveCard(
  input: PersonalStatsInput,
  user: UserPicks,
  pinnedLadder: LadderSwingCandidate | null | undefined
): CrowdStatCard | null {
  const ranked = rankPlayersForStats(input.userPicks, input.results);
  const rankByUser = new Map(ranked.map((p, i) => [p.userId, i + 1]));

  let candidate = pinnedLadder;
  if (!candidate) {
    candidate = computePinnedLadderSwing(
      input.matches,
      input.userPicks,
      input.results,
      input.matchConsensus,
      input.viewableUpcomingMatchIds
    );
  }
  if (!candidate) return null;

  const beforeRank = rankByUser.get(user.userId);
  if (!beforeRank) return null;

  const mover = candidate.movers.find((m) => m.displayName === user.displayName);
  if (!mover) return null;

  return {
    id: `personal-ladder-${user.userId}-${candidate.matchId}`,
    visualType: 'personal',
    kind: 'ladderMove',
    subtitle: 'If this scoreline lands',
    matchId: candidate.matchId,
    stage: candidate.stage,
    group: candidate.group,
    homeTeamId: candidate.homeTeamId,
    awayTeamId: candidate.awayTeamId,
    scoreline: candidate.scoreline,
    scorelinePct: candidate.scorelinePct,
    beforeRank: mover.beforeRank,
    afterRank: mover.afterRank,
    delta: mover.delta
  };
}

function buildYouVsCrowdCard(input: PersonalStatsInput, user: UserPicks): CrowdStatCard | null {
  const windows = getUpcomingKickoffWindows(input.matches, input.viewableUpcomingMatchIds);
  const eligible = windowMatchesWithUserPick(windows, user);
  if (eligible.length === 0) return null;

  const match = eligible[0];
  const consensus = input.matchConsensus.find((c) => c.matchId === match.id);
  const modal = consensus?.topScorelines[0];
  const pick = user.picks[match.id];
  if (!modal || !pick) return null;

  const yourPick = formatUserPickLabel(match, pick);
  const breakdown = scorelinesForMatch(match, input.userPicks);

  return {
    id: `personal-you-vs-crowd-${user.userId}-${match.id}`,
    visualType: 'personal',
    kind: 'youVsCrowd',
    subtitle: 'Your next pick',
    matchId: match.id,
    stage: match.stage,
    group: match.group,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    yourPick,
    crowdPick: modal.label,
    crowdPct: modal.pct,
    alignment: pickAlignment(pick, modal.label, match),
    scorelineBreakdown: selectScorelineChips(breakdown, yourPick)
  };
}

function buildContrarianCard(input: PersonalStatsInput, user: UserPicks): CrowdStatCard | null {
  const windows = getUpcomingKickoffWindows(input.matches, input.viewableUpcomingMatchIds);
  const eligible = windowMatchesWithUserPick(windows, user);
  if (eligible.length === 0) return null;

  let best: { match: Match; pct: number; label: string } | null = null;
  for (const match of eligible) {
    const consensus = input.matchConsensus.find((c) => c.matchId === match.id);
    if (!consensus) continue;
    const pick = user.picks[match.id];
    if (!pick) continue;
    const userLabel = formatUserPickLabel(match, pick);
    const entry = consensus.topScorelines.find((s) => s.label === userLabel);
    const pct = entry?.pct ?? 0;
    if (!best || pct < best.pct) {
      best = { match, pct, label: userLabel };
    }
  }
  if (!best || best.pct >= 50) return null;

  return {
    id: `personal-contrarian-${user.userId}-${best.match.id}`,
    visualType: 'personal',
    kind: 'contrarian',
    subtitle: 'Going against the grain',
    matchId: best.match.id,
    stage: best.match.stage,
    group: best.match.group,
    homeTeamId: best.match.homeTeamId,
    awayTeamId: best.match.awayTeamId,
    yourPick: best.label,
    crowdPct: best.pct
  };
}

function buildNearestRivalCard(input: PersonalStatsInput, user: UserPicks): CrowdStatCard | null {
  const ranked = rankPlayersForStats(input.userPicks, input.results);
  const userIndex = ranked.findIndex((p) => p.userId === user.userId);
  if (userIndex < 0) return null;

  const windows = getUpcomingKickoffWindows(input.matches, input.viewableUpcomingMatchIds);
  const windowMatches = [...windows.next, ...windows.secondNext];

  const neighbours = ranked
    .map((p, i) => ({ player: p, rank: i + 1 }))
    .filter((entry) => entry.player.userId !== user.userId)
    .filter((entry) => Math.abs(entry.rank - (userIndex + 1)) <= 2)
    .sort(
      (a, b) =>
        Math.abs(a.rank - (userIndex + 1)) - Math.abs(b.rank - (userIndex + 1)) || a.rank - b.rank
    );

  for (const match of windowMatches) {
    const pick = user.picks[match.id];
    if (!pick || pick.homeScore < 0) continue;
    const userLabel = formatUserPickLabel(match, pick);

    for (const neighbour of neighbours) {
      const rival = input.userPicks.find((u) => u.userId === neighbour.player.userId);
      if (!rival) continue;
      const rivalPick = rival.picks[match.id];
      if (!rivalPick || rivalPick.homeScore < 0) continue;
      const rivalLabel = formatUserPickLabel(match, rivalPick);
      if (rivalLabel === userLabel) continue;

      return {
        id: `personal-rival-${user.userId}-${rival.userId}-${match.id}`,
        visualType: 'personal',
        kind: 'nearestRival',
        subtitle: 'Head to head on next fixture',
        matchId: match.id,
        stage: match.stage,
        group: match.group,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        yourRank: userIndex + 1,
        rivalRank: neighbour.rank,
        rivalName: rival.displayName,
        yourPick: userLabel,
        rivalPick: rivalLabel
      };
    }
  }

  return null;
}

function buildHiveMindCard(input: PersonalStatsInput, user: UserPicks): CrowdStatCard | null {
  const eligible = upcomingMatchesWithUserPick(input, user);
  if (eligible.length === 0) return null;

  let userMatches = 0;
  let userModal = 0;
  let leagueMatches = 0;
  let leagueModal = 0;

  for (const match of eligible) {
    const consensus = input.matchConsensus.find((c) => c.matchId === match.id);
    const modal = consensus?.topScorelines[0];
    if (!modal) continue;

    const pick = user.picks[match.id];
    if (pick && pick.homeScore >= 0) {
      userMatches += 1;
      if (formatUserPickLabel(match, pick) === modal.label) userModal += 1;
    }

    for (const leagueUser of input.userPicks) {
      const leaguePick = leagueUser.picks[match.id];
      if (!leaguePick || leaguePick.homeScore < 0) continue;
      leagueMatches += 1;
      if (formatUserPickLabel(match, leaguePick) === modal.label) leagueModal += 1;
    }
  }

  if (userMatches < HIVE_MIND_MIN_MATCHES) return null;

  return {
    id: `personal-hive-${user.userId}`,
    visualType: 'personal',
    kind: 'hiveMind',
    subtitle: 'How mainstream are your picks?',
    hiveMindPct: Math.round((userModal / userMatches) * 100),
    leagueAvgPct: leagueMatches > 0 ? Math.round((leagueModal / leagueMatches) * 100) : 0,
    matchCount: userModal,
    matchTotal: userMatches
  };
}

function groupConsensusForGroup(
  groupConsensus: GroupConsensusItem[],
  groupId: string
): GroupConsensusItem | undefined {
  return groupConsensus.find((g) => g.groupId === groupId);
}

function userHasFullGroup(user: UserPicks, groupId: string): boolean {
  const ids = groupMatches.filter((m) => m.group === groupId).map((m) => m.id);
  return ids.every((id) => userHasPick(user, id));
}

function buildGroupDiffCard(input: PersonalStatsInput, user: UserPicks): CrowdStatCard | null {
  if (!input.groupPhaseLocked) return null;

  const windows = getUpcomingKickoffWindows(input.matches, input.viewableUpcomingMatchIds);
  const windowGroups = new Set(
    [...windows.next, ...windows.secondNext]
      .map((m) => m.group)
      .filter((g): g is string => Boolean(g))
  );

  const groupConsensus = computeGroupConsensus(input.userPicks, true);

  for (const groupId of [...windowGroups].sort()) {
    if (!userHasFullGroup(user, groupId)) continue;
    const consensus = groupConsensusForGroup(groupConsensus, groupId);
    if (!consensus || consensus.modalOrder.length < 4) continue;

    const yourOrderTeamIds = computeGroupPositions(groupId, user.picks);
    const yourOrder = yourOrderTeamIds.map((teamId) => {
      const team = teams.find((t) => t.id === teamId);
      return input.revealNames
        ? (team?.name ?? teamId)
        : `Pick ${consensus.modalOrder.indexOf(teamId) + 1}`;
    });
    const crowdOrderTeamIds = consensus.modalOrder;
    const crowdOrder = crowdOrderTeamIds.map((teamId) => {
      const team = teams.find((t) => t.id === teamId);
      return input.revealNames
        ? (team?.name ?? teamId)
        : `Pick ${consensus.modalOrder.indexOf(teamId) + 1}`;
    });

    const mismatchCount = yourOrderTeamIds.filter(
      (teamId, idx) => teamId !== crowdOrderTeamIds[idx]
    ).length;
    if (mismatchCount === 0) continue;

    return {
      id: `personal-group-diff-${user.userId}-${groupId}`,
      visualType: 'personal',
      kind: 'groupDiff',
      subtitle: 'Where you disagree',
      groupId,
      yourOrder,
      crowdOrder,
      yourOrderTeamIds,
      crowdOrderTeamIds,
      mismatchCount
    };
  }

  return null;
}

export function buildPersonalStatPool(input: PersonalStatsInput): CrowdStatCard[] {
  const user = input.userPicks.find((u) => u.userId === input.currentUserId);
  if (!user) return [];

  const builders = [
    () => buildLadderMoveCard(input, user, input.pinnedLadder),
    () => buildYouVsCrowdCard(input, user),
    () => buildContrarianCard(input, user),
    () => buildNearestRivalCard(input, user),
    () => buildHiveMindCard(input, user),
    () => buildGroupDiffCard(input, user)
  ];

  return builders.map((build) => build()).filter((card): card is CrowdStatCard => card !== null);
}

export function partitionPersonalStats(pool: CrowdStatCard[]): {
  pinnedHeadToHead?: CrowdStatCard;
  remainingPersonal: CrowdStatCard[];
} {
  const mixablePersonal = pool.filter(
    (card): card is Extract<CrowdStatCard, { visualType: 'personal' }> =>
      card.visualType === 'personal' && card.kind !== 'ladderMove'
  );
  const headToHead = mixablePersonal.find((card) => card.kind === 'nearestRival');

  if (headToHead) {
    return {
      pinnedHeadToHead: headToHead,
      remainingPersonal: mixablePersonal.filter((card) => card.id !== headToHead.id)
    };
  }

  if (mixablePersonal.length === 0) {
    return { remainingPersonal: [] };
  }

  const fallback = samplePersonalStat(mixablePersonal);
  return {
    pinnedHeadToHead: fallback,
    remainingPersonal: mixablePersonal.filter((card) => card.id !== fallback?.id)
  };
}

export function samplePersonalStat(
  pool: CrowdStatCard[],
  shuffle = true
): CrowdStatCard | undefined {
  if (pool.length === 0) return undefined;
  const ordered = shuffle ? shuffleItems(pool) : pool;
  return ordered[0];
}

export function ladderCandidateToCard(
  candidate: LadderSwingCandidate,
  pinned = false
): CrowdStatCard {
  return {
    id: `${pinned ? 'pinned' : 'ladder'}-ladder-${candidate.matchId}-${candidate.scoreline}`,
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
  };
}
