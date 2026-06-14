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
import { MatchConsensusItem, UserPicks } from './predictionStats';
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
      const simulated = scorelineLabelToResult(match.id, scoreline.label, match);
      if (!simulated) continue;

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

      if (movers.length === 0) continue;

      const maxSwing = Math.max(...movers.map((mover) => Math.abs(mover.delta)));
      if (maxSwing < 1) continue;

      candidates.push({
        matchId: match.id,
        stage: match.stage,
        group: match.group,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        scoreline: scoreline.label,
        scorelinePct: scoreline.pct,
        movers,
        maxSwing
      });
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
): Array<{ match: Match; playerA: string; playerB: string; rankA: number; rankB: number }> {
  const ranked = rankPlayers(userPicks, results);
  const rankByUser = ranksFromPlayers(ranked);
  const battles: Array<{ match: Match; playerA: string; playerB: string; rankA: number; rankB: number }> = [];

  const upcoming = matches
    .filter((match) => viewableUpcomingMatchIds.has(match.id))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  for (const match of upcoming.slice(0, 4)) {
    for (let i = 0; i < ranked.length; i += 1) {
      for (let j = i + 1; j < ranked.length; j += 1) {
        const rankA = rankByUser.get(ranked[i].userId) ?? 0;
        const rankB = rankByUser.get(ranked[j].userId) ?? 0;
        if (rankA === 0 || rankB === 0) continue;
        if (Math.abs(rankA - rankB) > 2) continue;

        const pickA = ranked[i].userId;
        const pickB = ranked[j].userId;
        const userA = userPicks.find((u) => u.userId === pickA);
        const userB = userPicks.find((u) => u.userId === pickB);
        if (!userA || !userB) continue;

        const pA = userA.picks[match.id];
        const pB = userB.picks[match.id];
        if (!pA || !pB || pA.homeScore < 0 || pB.homeScore < 0) continue;

        const sameOutcome =
          pA.homeScore === pB.homeScore &&
          pA.awayScore === pB.awayScore &&
          (pA.progressingTeamId ?? '') === (pB.progressingTeamId ?? '');
        if (sameOutcome) continue;

        battles.push({
          match,
          playerA: userA.displayName,
          playerB: userB.displayName,
          rankA,
          rankB
        });
        if (battles.length >= 6) return battles;
      }
    }
  }

  return battles;
}
