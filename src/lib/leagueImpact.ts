import { teams } from '../data/tournament';
import { deriveFinalPlacings } from './bracketEngine';
import { picksFromActuals } from './pickUtils';
import {
  compareFinalTieBreak,
  isTournamentFinalComplete,
  resolveCoinFlipAmongTied
} from './tieBreakCoinFlip';
import { computeScore } from './tournamentLogic';
import { scaledMatchPointsForStage } from './knockoutStageMultiplier';
import { evaluateMatchScoring } from './matchScoring';
import { formatScorelineLabel, MatchConsensusItem, pickKey, UserPicks } from './predictionStats';
import { getUpcomingKickoffWindows } from './upcomingFixtures';
import { ActualResult, LadderMover, Match } from '../types';

interface RankedPlayer {
  userId: string;
  name: string;
  points: number;
  tieBreak: {
    exactScores: number;
    correctResults: number;
    exactGroupPositions: number;
    bonusHits: number;
  };
}

export interface LadderSwingCandidate {
  matchId: string;
  stage: Match['stage'];
  group?: string;
  homeTeamId: string;
  awayTeamId: string;
  scoreline: string;
  scorelinePct: number;
  movers: LadderMover[];
  maxSwing: number;
}

function scorelineLabelToResult(matchId: string, label: string, match: Match): ActualResult | null {
  const advMatch = label.match(/^(\d+)-(\d+) \(adv: (.+)\)$/);
  if (advMatch) {
    const [, home, away, teamName] = advMatch;
    const team = teams.find((t) => t.name === teamName);
    return {
      matchId,
      homeScore: Number(home),
      awayScore: Number(away),
      progressingTeamId: team?.id
    };
  }

  const simple = label.match(/^(\d+)-(\d+)$/);
  if (simple) {
    return {
      matchId,
      homeScore: Number(simple[1]),
      awayScore: Number(simple[2])
    };
  }

  return null;
}

function rankPlayers(userPicks: UserPicks[], results: Record<string, ActualResult>): RankedPlayer[] {
  const finalPlacings = deriveFinalPlacings(picksFromActuals(results), results);
  const finalComplete = isTournamentFinalComplete(results);

  const entries: RankedPlayer[] = userPicks.map((user) => {
    const summary = computeScore(user.picks, results, user.bonus, finalPlacings);
    return {
      userId: user.userId,
      name: user.displayName,
      points: summary.points,
      tieBreak: {
        exactScores: summary.exactScores,
        correctResults: summary.correctResults,
        exactGroupPositions: summary.exactGroupPositions,
        bonusHits: summary.bonusHits
      }
    };
  });

  const sorted = [...entries].sort(
    (a, b) =>
      b.points - a.points ||
      b.tieBreak.exactScores - a.tieBreak.exactScores ||
      b.tieBreak.correctResults - a.tieBreak.correctResults ||
      b.tieBreak.exactGroupPositions - a.tieBreak.exactGroupPositions ||
      b.tieBreak.bonusHits - a.tieBreak.bonusHits ||
      compareFinalTieBreak(a, b, finalComplete)
  );

  resolveCoinFlipAmongTied(sorted, finalComplete);
  return sorted;
}

function ranksFromPlayers(players: RankedPlayer[]): Map<string, number> {
  return new Map(players.map((player, index) => [player.userId, index + 1]));
}

function buildPinnedLadderSwingForScoreline(
  match: Match,
  scorelineLabel: string,
  scorelinePct: number,
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  baselineRanks: Map<string, number>
): LadderSwingCandidate | null {
  const simulated = scorelineLabelToResult(match.id, scorelineLabel, match);
  if (!simulated) return null;

  const withResult = { ...results, [match.id]: simulated };
  const afterPlayers = rankPlayers(userPicks, withResult);
  const afterRanks = ranksFromPlayers(afterPlayers);

  const movers: LadderMover[] = userPicks
    .map((user) => {
      const beforeRank = baselineRanks.get(user.userId) ?? 0;
      const afterRank = afterRanks.get(user.userId) ?? 0;
      if (beforeRank === 0 || afterRank === 0 || beforeRank === afterRank) return null;
      return {
        displayName: user.displayName,
        beforeRank,
        afterRank,
        delta: beforeRank - afterRank
      };
    })
    .filter((mover): mover is LadderMover => mover !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);

  const maxSwing = movers.length > 0 ? Math.max(...movers.map((mover) => Math.abs(mover.delta))) : 0;

  return {
    matchId: match.id,
    stage: match.stage,
    group: match.group,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    scoreline: scorelineLabel,
    scorelinePct,
    movers,
    maxSwing
  };
}

function buildLadderSwingForScoreline(
  match: Match,
  scorelineLabel: string,
  scorelinePct: number,
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  baselineRanks: Map<string, number>
): LadderSwingCandidate | null {
  const simulated = scorelineLabelToResult(match.id, scorelineLabel, match);
  if (!simulated) return null;

  const withResult = { ...results, [match.id]: simulated };
  const afterPlayers = rankPlayers(userPicks, withResult);
  const afterRanks = ranksFromPlayers(afterPlayers);

  const movers: LadderMover[] = userPicks
    .map((user) => {
      const beforeRank = baselineRanks.get(user.userId) ?? 0;
      const afterRank = afterRanks.get(user.userId) ?? 0;
      if (beforeRank === 0 || afterRank === 0 || beforeRank === afterRank) return null;
      return {
        displayName: user.displayName,
        beforeRank,
        afterRank,
        delta: beforeRank - afterRank
      };
    })
    .filter((mover): mover is LadderMover => mover !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);

  if (movers.length === 0) return null;

  const maxSwing = Math.max(...movers.map((mover) => Math.abs(mover.delta)));
  if (maxSwing < 1) return null;

  return {
    matchId: match.id,
    stage: match.stage,
    group: match.group,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    scoreline: scorelineLabel,
    scorelinePct,
    movers,
    maxSwing
  };
}

export function rankPlayersForStats(
  userPicks: UserPicks[],
  results: Record<string, ActualResult>
): RankedPlayer[] {
  return rankPlayers(userPicks, results);
}

export function computePinnedLadderSwing(
  matches: Match[],
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  matchConsensus: MatchConsensusItem[],
  viewableUpcomingMatchIds: Set<string>
): LadderSwingCandidate | null {
  if (userPicks.length < 2) return null;

  const windows = getUpcomingKickoffWindows(matches, viewableUpcomingMatchIds);
  const baselineRanks = ranksFromPlayers(rankPlayers(userPicks, results));

  for (const wave of [windows.next, windows.secondNext]) {
    if (wave.length === 0) continue;

    let best: LadderSwingCandidate | null = null;
    for (const match of wave) {
      const consensus = matchConsensus.find((item) => item.matchId === match.id);
      const modal = consensus?.topScorelines[0];
      if (!modal) continue;

      const candidate = buildPinnedLadderSwingForScoreline(
        match,
        modal.label,
        modal.pct,
        userPicks,
        results,
        baselineRanks
      );
      if (!candidate || candidate.maxSwing < 1) continue;
      if (!best || candidate.maxSwing > best.maxSwing) {
        best = candidate;
      }
    }
    if (best) return best;
  }

  return null;
}

/** @deprecated Use computePinnedLadderSwing for single pinned card */
export function computePinnedLadderSwings(
  matches: Match[],
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  matchConsensus: MatchConsensusItem[],
  viewableUpcomingMatchIds: Set<string>
): LadderSwingCandidate[] {
  const single = computePinnedLadderSwing(
    matches,
    userPicks,
    results,
    matchConsensus,
    viewableUpcomingMatchIds
  );
  return single ? [single] : [];
}

export interface RankClusterBattle {
  match: Match;
  playerA: string;
  playerB: string;
  rankA: number;
  rankB: number;
  pickALabel: string;
  pickBLabel: string;
}

function formatPickLabel(
  match: Match,
  pick: { matchId?: string; homeScore: number; awayScore: number; progressingTeamId?: string }
): string {
  const fullPick = {
    matchId: pick.matchId ?? match.id,
    homeScore: pick.homeScore,
    awayScore: pick.awayScore,
    progressingTeamId: pick.progressingTeamId
  };
  return formatScorelineLabel(pickKey(fullPick, match.stage, match));
}

function picksDiffer(
  pickA: { homeScore: number; awayScore: number; progressingTeamId?: string },
  pickB: { homeScore: number; awayScore: number; progressingTeamId?: string }
): boolean {
  return (
    pickA.homeScore !== pickB.homeScore ||
    pickA.awayScore !== pickB.awayScore ||
    (pickA.progressingTeamId ?? '') !== (pickB.progressingTeamId ?? '')
  );
}

function tryBattle(
  match: Match,
  userA: UserPicks,
  userB: UserPicks,
  rankA: number,
  rankB: number
): RankClusterBattle | null {
  const pA = userA.picks[match.id];
  const pB = userB.picks[match.id];
  if (!pA || !pB || pA.homeScore < 0 || pB.homeScore < 0) return null;
  if (!picksDiffer(pA, pB)) return null;

  return {
    match,
    playerA: userA.displayName,
    playerB: userB.displayName,
    rankA,
    rankB,
    pickALabel: formatPickLabel(match, pA),
    pickBLabel: formatPickLabel(match, pB)
  };
}

export function computeLadderSwingCandidates(
  matches: Match[],
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  matchConsensus: MatchConsensusItem[],
  viewableUpcomingMatchIds: Set<string>
): LadderSwingCandidate[] {
  if (userPicks.length < 2) return [];

  const baselinePlayers = rankPlayers(userPicks, results);
  const baselineRanks = ranksFromPlayers(baselinePlayers);

  const upcomingMatches = matches
    .filter((match) => viewableUpcomingMatchIds.has(match.id))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  const candidates: LadderSwingCandidate[] = [];

  for (const match of upcomingMatches.slice(0, 6)) {
    const consensus = matchConsensus.find((item) => item.matchId === match.id);
    if (!consensus || consensus.topScorelines.length === 0) continue;

    for (const scoreline of consensus.topScorelines.slice(0, 3)) {
      const candidate = buildLadderSwingForScoreline(
        match,
        scoreline.label,
        scoreline.pct,
        userPicks,
        results,
        baselineRanks
      );
      if (candidate) candidates.push(candidate);
    }
  }

  return candidates.sort((a, b) => b.maxSwing - a.maxSwing);
}

export function computePointsOnTheLine(
  match: Match,
  userPicks: UserPicks[],
  modalScoreline: string
): number {
  const simulated = scorelineLabelToResult(match.id, modalScoreline, match);
  if (!simulated) return 0;

  let total = 0;
  for (const user of userPicks) {
    const pick = user.picks[match.id];
    if (!pick || pick.homeScore < 0 || pick.awayScore < 0) continue;
    const { correctResult, exactScore } = evaluateMatchScoring(pick, simulated, match.stage, match);
    const scaled = scaledMatchPointsForStage(match.stage, { correctResult, exactScore });
    total += scaled.total;
  }

  return total;
}

export function computeRankClusterBattles(
  matches: Match[],
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  viewableUpcomingMatchIds: Set<string>
): RankClusterBattle[] {
  const ranked = rankPlayers(userPicks, results);
  const rankByUser = ranksFromPlayers(ranked);
  const battles: RankClusterBattle[] = [];

  const upcoming = matches
    .filter((match) => viewableUpcomingMatchIds.has(match.id))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  if (upcoming.length === 0 || ranked.length < 2) return battles;

  const nextWaveKickoff = upcoming[0].kickoff;
  const nextWave = upcoming.filter((match) => match.kickoff === nextWaveKickoff);

  const leader = ranked[0];
  const runnerUp = ranked[1];
  const leaderUser = userPicks.find((u) => u.userId === leader.userId);
  const runnerUpUser = userPicks.find((u) => u.userId === runnerUp.userId);
  const leaderRank = rankByUser.get(leader.userId) ?? 0;
  const runnerUpRank = rankByUser.get(runnerUp.userId) ?? 0;

  if (leaderUser && runnerUpUser) {
    for (const match of nextWave) {
      const headToHead = tryBattle(match, leaderUser, runnerUpUser, leaderRank, runnerUpRank);
      if (headToHead) {
        return [headToHead];
      }
    }
  }

  for (const match of nextWave) {
    for (let i = 0; i < ranked.length; i += 1) {
      for (let j = i + 1; j < ranked.length; j += 1) {
        const rankA = rankByUser.get(ranked[i].userId) ?? 0;
        const rankB = rankByUser.get(ranked[j].userId) ?? 0;
        if (rankA === 0 || rankB === 0) continue;
        if (Math.abs(rankA - rankB) > 2) continue;

        const userA = userPicks.find((u) => u.userId === ranked[i].userId);
        const userB = userPicks.find((u) => u.userId === ranked[j].userId);
        if (!userA || !userB) continue;

        const battle = tryBattle(match, userA, userB, rankA, rankB);
        if (battle) {
          battles.push(battle);
          if (battles.length >= 1) return battles;
        }
      }
    }
  }

  for (const match of upcoming.slice(nextWave.length)) {
    for (let i = 0; i < ranked.length; i += 1) {
      for (let j = i + 1; j < ranked.length; j += 1) {
        const rankA = rankByUser.get(ranked[i].userId) ?? 0;
        const rankB = rankByUser.get(ranked[j].userId) ?? 0;
        if (rankA === 0 || rankB === 0) continue;
        if (Math.abs(rankA - rankB) > 2) continue;

        const userA = userPicks.find((u) => u.userId === ranked[i].userId);
        const userB = userPicks.find((u) => u.userId === ranked[j].userId);
        if (!userA || !userB) continue;

        const battle = tryBattle(match, userA, userB, rankA, rankB);
        if (battle) {
          battles.push(battle);
          if (battles.length >= 1) return battles;
        }
      }
    }
  }

  return battles;
}

export interface VolatileFixtureResult {
  candidate: LadderSwingCandidate;
  ranksMoved: number;
}

export function computeMostVolatileFixture(
  matches: Match[],
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  matchConsensus: MatchConsensusItem[],
  viewableUpcomingMatchIds: Set<string>
): VolatileFixtureResult | null {
  const windows = getUpcomingKickoffWindows(matches, viewableUpcomingMatchIds);
  const baselineRanks = ranksFromPlayers(rankPlayers(userPicks, results));

  let best: VolatileFixtureResult | null = null;

  for (const wave of [windows.next, windows.secondNext]) {
    for (const match of wave) {
      const consensus = matchConsensus.find((item) => item.matchId === match.id);
      const modal = consensus?.topScorelines[0];
      if (!modal) continue;

      const candidate = buildPinnedLadderSwingForScoreline(
        match,
        modal.label,
        modal.pct,
        userPicks,
        results,
        baselineRanks
      );
      if (!candidate || candidate.movers.length === 0) continue;

      const result = { candidate, ranksMoved: candidate.movers.length };
      if (!best || candidate.maxSwing > best.candidate.maxSwing) {
        best = result;
      }
    }
    if (best) return best;
  }

  return best;
}

export interface RankClusterEntry {
  userId: string;
  displayName: string;
  rank: number;
  points: number;
  isCurrentUser?: boolean;
}

export function computeTightestRankCluster(
  userPicks: UserPicks[],
  results: Record<string, ActualResult>,
  currentUserId?: string
): { players: RankClusterEntry[]; pointSpread: number } | null {
  const ranked = rankPlayers(userPicks, results);
  if (ranked.length < 3) return null;

  let bestCluster: RankClusterEntry[] | null = null;
  let bestSpread = Number.POSITIVE_INFINITY;

  for (let start = 0; start < ranked.length; start += 1) {
    for (let size = 4; size >= 3; size -= 1) {
      const slice = ranked.slice(start, start + size);
      if (slice.length < 3) continue;
      const spread = slice[0].points - slice[slice.length - 1].points;
      if (spread > 4) continue;
      if (spread < bestSpread || (spread === bestSpread && slice.length > (bestCluster?.length ?? 0))) {
        bestSpread = spread;
        bestCluster = slice.map((player, idx) => ({
          userId: player.userId,
          displayName: player.name,
          rank: start + idx + 1,
          points: player.points,
          ...(currentUserId && player.userId === currentUserId ? { isCurrentUser: true } : {})
        }));
      }
    }
  }

  if (!bestCluster) return null;
  return { players: bestCluster, pointSpread: bestSpread };
}
