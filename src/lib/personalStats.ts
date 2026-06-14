import { teams, groupMatches } from '../data/tournament';
import { computeGroupPositions } from './groupStandings';
import { maxMatchPointsForStage } from './knockoutStageMultiplier';
import {
  computeGroupConsensus,
  formatScorelineLabel,
  GroupConsensusItem,
  MatchConsensusItem,
  pickKey,
  UserPicks
} from './predictionStats';
import { getUpcomingKickoffWindows } from './upcomingFixtures';
import {
  computePinnedLadderSwing,
  LadderSwingCandidate,
  rankPlayersForStats
} from './leagueImpact';
import { ActualResult, CrowdStatCard, Match, NearbyFixturePlayer } from '../types';

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

function buildNearbyPlayersForMatch(
  input: PersonalStatsInput,
  user: UserPicks,
  match: Match,
  ranked: ReturnType<typeof rankPlayersForStats>,
  userIndex: number
): NearbyFixturePlayer[] {
  const userPoints = ranked[userIndex].points;
  const threshold = maxMatchPointsForStage(match.stage);
  const players: NearbyFixturePlayer[] = [];

  for (let index = 0; index < ranked.length; index += 1) {
    const player = ranked[index];
    const leagueUser = input.userPicks.find((u) => u.userId === player.userId);
    if (!leagueUser) continue;
    const pick = leagueUser.picks[match.id];
    if (!pick || pick.homeScore < 0) continue;
    if (Math.abs(player.points - userPoints) > threshold) continue;

    players.push({
      userId: player.userId,
      rank: index + 1,
      displayName: player.name,
      points: player.points,
      pick: formatUserPickLabel(match, pick),
      ...(player.userId === user.userId ? { isCurrentUser: true } : {})
    });
  }

  return players.sort((a, b) => a.rank - b.rank);
}

function buildNearestRivalCard(input: PersonalStatsInput, user: UserPicks): CrowdStatCard | null {
  const ranked = rankPlayersForStats(input.userPicks, input.results);
  const userIndex = ranked.findIndex((p) => p.userId === user.userId);
  if (userIndex < 0) return null;

  const windows = getUpcomingKickoffWindows(input.matches, input.viewableUpcomingMatchIds);
  const windowMatches = [...windows.next, ...windows.secondNext];

  for (const match of windowMatches) {
    const pick = user.picks[match.id];
    if (!pick || pick.homeScore < 0) continue;

    const nearbyPlayers = buildNearbyPlayersForMatch(input, user, match, ranked, userIndex);
    if (nearbyPlayers.length < 2) continue;

    return {
      id: `personal-rival-${user.userId}-${match.id}`,
      visualType: 'personal',
      kind: 'nearestRival',
      subtitle: 'Head to head on next fixture',
      matchId: match.id,
      stage: match.stage,
      group: match.group,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      nearbyPlayers
    };
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
      subtitle: `Where you disagree — Group ${groupId}`,
      groupId,
      yourOrder,
      crowdOrder,
      yourOrderTeamIds,
      crowdOrderTeamIds
    };
  }

  return null;
}

export function buildPersonalStatPool(input: PersonalStatsInput): CrowdStatCard[] {
  const user = input.userPicks.find((u) => u.userId === input.currentUserId);
  if (!user) return [];

  const builders = [
    () => buildLadderMoveCard(input, user, input.pinnedLadder),
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
