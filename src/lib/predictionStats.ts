import { isBaldPlayer } from '../data/baldPlayers';
import { groupMatches, teams } from '../data/tournament';
import { computeGroupPositions } from './groupStandings';
import { advancingTeamId } from './matchScoring';
import { Match, Pick as MatchPick, Stage, TournamentBonusPick } from '../types';

export interface PickCount {
  label: string;
  count: number;
  pct: number;
}

export interface MatchPickInput {
  matchId: string;
  stage: Stage;
  group?: string;
  homeTeamId: string;
  awayTeamId: string;
  pick: MatchPick;
  userId: string;
  displayName: string;
}

export interface UserPicks {
  userId: string;
  displayName: string;
  picks: Record<string, MatchPick>;
  bonus?: TournamentBonusPick;
}

type FixtureTeams = Pick<Match, 'homeTeamId' | 'awayTeamId'>;

export function pickKey(pick: MatchPick, stage: Stage, match: FixtureTeams): string {
  if (pick.homeScore === pick.awayScore && stage !== 'GROUP') {
    const advancer = advancingTeamId(match, pick);
    return advancer
      ? `${pick.homeScore}-${pick.awayScore}|${advancer}`
      : `${pick.homeScore}-${pick.awayScore}`;
  }
  return `${pick.homeScore}-${pick.awayScore}`;
}

export function formatScorelineLabel(key: string): string {
  const [score, advancer] = key.split('|');
  if (advancer) {
    const team = teams.find((t) => t.id === advancer);
    return `${score} (adv: ${team?.name ?? advancer})`;
  }
  return score;
}

function resultLabel(pick: MatchPick, stage: Stage, match: FixtureTeams): string {
  if (stage !== 'GROUP') {
    const advancer = advancingTeamId(match, pick);
    return advancer ?? 'D';
  }
  if (pick.homeScore > pick.awayScore) return 'H';
  if (pick.homeScore < pick.awayScore) return 'A';
  return 'D';
}

function countMapToSortedList(
  counts: Map<string, number>,
  total: number,
  formatLabel = (k: string) => k
): PickCount[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      label: formatLabel(key),
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0
    }));
}

export interface MatchConsensusItem {
  matchId: string;
  stage: Stage;
  group?: string;
  homeTeamId: string;
  awayTeamId: string;
  totalPicks: number;
  topScorelines: PickCount[];
  resultSplit: PickCount[];
  modePct: number;
  distinctScorelines: number;
}

export function computeMatchConsensus(
  matches: Match[],
  userPicks: UserPicks[],
  viewableMatchIds: Set<string>
): MatchConsensusItem[] {
  const items: MatchConsensusItem[] = [];

  for (const match of matches) {
    if (!viewableMatchIds.has(match.id)) continue;

    const scoreCounts = new Map<string, number>();
    const resultCounts = new Map<string, number>();
    let total = 0;

    for (const user of userPicks) {
      const pick = user.picks[match.id];
      if (!pick || pick.homeScore < 0 || pick.awayScore < 0) continue;

      total += 1;
      const key = pickKey(pick, match.stage, match);
      scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);

      const result = resultLabel(pick, match.stage, match);
      resultCounts.set(result, (resultCounts.get(result) ?? 0) + 1);
    }

    if (total === 0) continue;

    const topScorelines = countMapToSortedList(scoreCounts, total, formatScorelineLabel).slice(
      0,
      3
    );
    const modeCount = topScorelines[0]?.count ?? 0;
    const modePct = total > 0 ? Math.round((modeCount / total) * 100) : 0;

    items.push({
      matchId: match.id,
      stage: match.stage,
      group: match.group,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      totalPicks: total,
      topScorelines,
      resultSplit: countMapToSortedList(resultCounts, total, (k) => {
        const homeName = teams.find((t) => t.id === match.homeTeamId)?.name ?? match.homeTeamId;
        const awayName = teams.find((t) => t.id === match.awayTeamId)?.name ?? match.awayTeamId;
        if (k === 'H') return `${homeName} win`;
        if (k === 'A') return `${awayName} win`;
        if (k === 'D') return 'Draw';
        const team = teams.find((t) => t.id === k);
        return team ? `${team.name} advances` : `${k} advances`;
      }),
      modePct,
      distinctScorelines: scoreCounts.size
    });
  }

  return items;
}

export interface Headlines {
  hiveMind: {
    matchId: string;
    homeTeamId: string;
    awayTeamId: string;
    scoreline: string;
    count: number;
    total: number;
    pct: number;
  } | null;
  roomForDebate: {
    matchId: string;
    homeTeamId: string;
    awayTeamId: string;
    distinctScorelines: number;
  } | null;
  scorelineKing: { scoreline: string; count: number } | null;
}

export function computeHeadlines(
  matchConsensus: MatchConsensusItem[],
  allViewablePicks: MatchPickInput[]
): Headlines {
  let hiveMind: Headlines['hiveMind'] = null;
  let bestModePct = -1;

  for (const item of matchConsensus) {
    if (item.totalPicks < 2) continue;
    if (item.modePct > bestModePct) {
      bestModePct = item.modePct;
      const top = item.topScorelines[0];
      hiveMind = {
        matchId: item.matchId,
        homeTeamId: item.homeTeamId,
        awayTeamId: item.awayTeamId,
        scoreline: top?.label ?? '',
        count: top?.count ?? 0,
        total: item.totalPicks,
        pct: item.modePct
      };
    }
  }

  let roomForDebate: Headlines['roomForDebate'] = null;
  let maxDistinct = 0;
  for (const item of matchConsensus) {
    if (item.distinctScorelines > maxDistinct) {
      maxDistinct = item.distinctScorelines;
      roomForDebate = {
        matchId: item.matchId,
        homeTeamId: item.homeTeamId,
        awayTeamId: item.awayTeamId,
        distinctScorelines: item.distinctScorelines
      };
    }
  }

  const globalCounts = new Map<string, number>();
  for (const entry of allViewablePicks) {
    const key = pickKey(entry.pick, entry.stage, entry);
    globalCounts.set(key, (globalCounts.get(key) ?? 0) + 1);
  }

  let scorelineKing: Headlines['scorelineKing'] = null;
  let bestGlobal = 0;
  for (const [key, count] of globalCounts) {
    if (count > bestGlobal) {
      bestGlobal = count;
      scorelineKing = { scoreline: formatScorelineLabel(key), count };
    }
  }

  return { hiveMind, roomForDebate, scorelineKing };
}

export interface GroupConsensusItem {
  groupId: string;
  modalOrder: string[];
  modalCount: number;
  modalPct: number;
  positionPopularity: Array<{
    rank: 1 | 2 | 3 | 4;
    teams: PickCount[];
  }>;
  distinctWinners: number;
}

const GROUP_IDS = [...new Set(teams.map((t) => t.group))].sort();

function buildGroupConsensusForUsers(userPicks: UserPicks[]): GroupConsensusItem[] {
  return GROUP_IDS.map((groupId) => {
    const groupMatchIds = groupMatches.filter((m) => m.group === groupId).map((m) => m.id);
    const orderCounts = new Map<string, { order: string[]; count: number }>();
    const positionCounts: Array<Map<string, number>> = [new Map(), new Map(), new Map(), new Map()];
    let playersWithFullGroup = 0;

    for (const user of userPicks) {
      const hasAll = groupMatchIds.every((id) => {
        const pick = user.picks[id];
        return pick && pick.homeScore >= 0 && pick.awayScore >= 0;
      });
      if (!hasAll) continue;

      playersWithFullGroup += 1;
      const positions = computeGroupPositions(groupId, user.picks);
      const orderKey = positions.join('|');
      const existing = orderCounts.get(orderKey);
      if (existing) {
        existing.count += 1;
      } else {
        orderCounts.set(orderKey, { order: positions, count: 1 });
      }

      positions.forEach((teamId, idx) => {
        const map = positionCounts[idx];
        map.set(teamId, (map.get(teamId) ?? 0) + 1);
      });
    }

    let modalOrder: string[] = [];
    let modalCount = 0;
    for (const { order, count } of orderCounts.values()) {
      if (count > modalCount) {
        modalCount = count;
        modalOrder = order;
      }
    }

    const winners = new Set<string>();
    for (const map of positionCounts) {
      for (const [teamId, count] of map) {
        if (map === positionCounts[0] && count > 0) winners.add(teamId);
      }
    }

    return {
      groupId,
      modalOrder,
      modalCount,
      modalPct:
        playersWithFullGroup > 0 ? Math.round((modalCount / playersWithFullGroup) * 100) : 0,
      positionPopularity: ([1, 2, 3, 4] as const).map((rank) => ({
        rank,
        teams: countMapToSortedList(positionCounts[rank - 1], playersWithFullGroup, (teamId) => {
          const team = teams.find((t) => t.id === teamId);
          return team?.name ?? teamId;
        })
      })),
      distinctWinners: winners.size
    };
  });
}

export function computeGroupConsensus(
  userPicks: UserPicks[],
  groupPhaseLocked: boolean
): GroupConsensusItem[] {
  if (!groupPhaseLocked) return [];
  return buildGroupConsensusForUsers(userPicks);
}

export interface MysteryStat {
  icon: string;
  text: string;
}

export const MYSTERY_STATS_DISPLAY_COUNT = 5;

export interface MysteryStatsOptions {
  /** When true, may include the bald-head easter egg (caller rolls ~5% on refresh). */
  includeBaldStat?: boolean;
  /** When false, returns the first N pool entries (for tests). Default true. */
  shuffle?: boolean;
}

function shuffleMysteryStats<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function bonusPickConsensus(
  userPicks: UserPicks[],
  selector: (bonus: TournamentBonusPick) => string,
  icon: string,
  label: string
): MysteryStat | null {
  const bonusUsers = userPicks.filter((u) => selector(u.bonus!));
  if (bonusUsers.length < 2) return null;

  const counts = new Map<string, number>();
  for (const user of bonusUsers) {
    const id = selector(user.bonus!);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;

  const pct = Math.round((top[1] / bonusUsers.length) * 100);
  if (pct < 50) return null;

  return {
    icon,
    text: `${pct}% of players have picked the same tournament ${label}.`
  };
}

/** Build the full mystery-stat candidate pool (typically 10+ items). */
export function buildMysteryStatPool(
  userPicks: UserPicks[],
  options: MysteryStatsOptions = {}
): MysteryStat[] {
  const pool: MysteryStat[] = [];
  const groupConsensus = buildGroupConsensusForUsers(userPicks);

  const groupPicks = userPicks.flatMap((user) =>
    Object.values(user.picks).filter(
      (pick) => pick.matchId.startsWith('g-') && pick.homeScore >= 0 && pick.awayScore >= 0
    )
  );

  const withPicks = userPicks.filter((u) => Object.keys(u.picks).length > 0);
  const playersWithPicks = withPicks.length;

  if (groupPicks.length > 0) {
    const draws = groupPicks.filter((p) => p.homeScore === p.awayScore).length;
    const drawPct = Math.round((draws / groupPicks.length) * 100);
    if (drawPct > 0) {
      pool.push({
        icon: '🤝',
        text: `${drawPct}% of submitted group-stage picks are draws — the crowd ${drawPct >= 35 ? 'loves a stalemate' : 'is split on goals'}.`
      });
    }

    const cleanSheets = groupPicks.filter((p) => p.homeScore === 0 || p.awayScore === 0).length;
    const cleanPct = Math.round((cleanSheets / groupPicks.length) * 100);
    pool.push({
      icon: '🧤',
      text: `${cleanPct}% of submitted group picks include at least one clean sheet.`
    });

    const totalGoals = groupPicks.reduce((sum, p) => sum + p.homeScore + p.awayScore, 0);
    const avgGoals = (totalGoals / groupPicks.length).toFixed(1);
    pool.push({
      icon: '⚽',
      text: `The crowd averages ${avgGoals} goals per submitted group-stage pick.`
    });

    pool.push({
      icon: '📝',
      text: `${groupPicks.length} group-stage picks have been submitted so far.`
    });
  }

  const withWinnerConsensus = groupConsensus
    .map((g) => ({
      groupId: g.groupId,
      pct: g.positionPopularity[0]?.teams[0]?.pct ?? 0
    }))
    .filter((g) => g.pct > 0);

  const topWinner = [...withWinnerConsensus].sort((a, b) => b.pct - a.pct)[0];
  if (topWinner && topWinner.pct >= 50) {
    pool.push({
      icon: '👥',
      text: `${topWinner.pct}% of players who've completed Group ${topWinner.groupId} picked the same group winner.`
    });
  }

  const splitWinner = [...withWinnerConsensus].sort((a, b) => a.pct - b.pct)[0];
  if (splitWinner && splitWinner.pct > 0 && splitWinner.pct < topWinner?.pct) {
    pool.push({
      icon: '🔀',
      text: `Group ${splitWinner.groupId} is the most divided on who wins — only ${splitWinner.pct}% agree on top spot.`
    });
  }

  const orderConsensus = [...groupConsensus]
    .filter((g) => g.modalCount > 0)
    .sort((a, b) => b.modalPct - a.modalPct)[0];
  if (orderConsensus && orderConsensus.modalPct >= 40) {
    pool.push({
      icon: '📊',
      text: `Group ${orderConsensus.groupId} has the strongest standings consensus — ${orderConsensus.modalPct}% predict the same full top 4.`
    });
  }

  const chaos = [...groupConsensus].sort((a, b) => b.distinctWinners - a.distinctWinners)[0];
  if (chaos && chaos.distinctWinners >= 3) {
    pool.push({
      icon: '🎲',
      text: `Group ${chaos.groupId} is the wild card — ${chaos.distinctWinners} different teams are tipped to win it.`
    });
  }

  const championStat = bonusPickConsensus(
    userPicks.filter((u) => u.bonus?.winnerTeamId),
    (b) => b.winnerTeamId,
    '🏆',
    'champion'
  );
  if (championStat) pool.push(championStat);

  const runnerUpStat = bonusPickConsensus(
    userPicks.filter((u) => u.bonus?.runnerUpTeamId),
    (b) => b.runnerUpTeamId,
    '🥈',
    'runner-up'
  );
  if (runnerUpStat) pool.push(runnerUpStat);

  if (playersWithPicks > 0) {
    pool.push({
      icon: '🔒',
      text: `${playersWithPicks} player${playersWithPicks === 1 ? '' : 's'} have submitted picks — full crowd stats unlock after the first kickoff.`
    });
  }

  if (options.includeBaldStat && playersWithPicks > 0) {
    const baldWithPicks = withPicks.filter((u) => isBaldPlayer(u.displayName)).length;
    if (baldWithPicks > 0) {
      const baldPct = Math.round((baldWithPicks / withPicks.length) * 100);
      pool.push({
        icon: '🧑‍🦲',
        text: `${baldPct}% of players with picks have a bald head.`
      });
    }
  }

  return pool;
}

/** Teaser stats before group lock — shuffles pool and returns five per refresh. */
export function computeMysteryStats(
  userPicks: UserPicks[],
  options: MysteryStatsOptions = {}
): MysteryStat[] {
  const pool = buildMysteryStatPool(userPicks, options);
  const ordered = options.shuffle === false ? pool : shuffleMysteryStats(pool);
  return ordered.slice(0, MYSTERY_STATS_DISPLAY_COUNT);
}

export interface TournamentOutlookData {
  visible: boolean;
  champion: PickCount[];
  runnerUp: PickCount[];
  third: PickCount[];
  fourth: PickCount[];
  darkHorse: { teamId: string; playerName: string } | null;
}

function countBonusPicks(
  userPicks: UserPicks[],
  selector: (bonus: TournamentBonusPick) => string
): PickCount[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const user of userPicks) {
    if (!user.bonus) continue;
    const teamId = selector(user.bonus);
    if (!teamId) continue;
    total += 1;
    counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
  }
  return countMapToSortedList(counts, total, (teamId) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.name ?? teamId;
  });
}

export function computeTournamentOutlook(
  userPicks: UserPicks[],
  groupPhaseLocked: boolean
): TournamentOutlookData {
  if (!groupPhaseLocked) {
    return {
      visible: false,
      champion: [],
      runnerUp: [],
      third: [],
      fourth: [],
      darkHorse: null
    };
  }

  const champion = countBonusPicks(userPicks, (b) => b.winnerTeamId);
  const runnerUp = countBonusPicks(userPicks, (b) => b.runnerUpTeamId);
  const third = countBonusPicks(userPicks, (b) => b.thirdTeamId);
  const fourth = countBonusPicks(userPicks, (b) => b.fourthTeamId);

  let darkHorse: TournamentOutlookData['darkHorse'] = null;
  const championCounts = new Map<string, { count: number; playerName?: string }>();
  for (const user of userPicks) {
    if (!user.bonus?.winnerTeamId) continue;
    const id = user.bonus.winnerTeamId;
    const existing = championCounts.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      championCounts.set(id, { count: 1, playerName: user.displayName });
    }
  }
  for (const [teamId, { count, playerName }] of championCounts) {
    if (count === 1 && playerName) {
      darkHorse = { teamId, playerName };
      break;
    }
  }

  return { visible: true, champion, runnerUp, third, fourth, darkHorse };
}

export interface FunFact {
  icon: string;
  text: string;
}

export function computeFunFacts(
  matchConsensus: MatchConsensusItem[],
  groupConsensus: GroupConsensusItem[],
  userPicks: UserPicks[],
  allViewablePicks: MatchPickInput[],
  tournamentOutlook: TournamentOutlookData
): FunFact[] {
  const facts: FunFact[] = [];
  if (allViewablePicks.length === 0) return facts;

  const groupPicks = allViewablePicks.filter((p) => p.stage === 'GROUP');
  if (groupPicks.length > 0) {
    const draws = groupPicks.filter((p) => p.pick.homeScore === p.pick.awayScore).length;
    const drawPct = Math.round((draws / groupPicks.length) * 100);
    facts.push({
      icon: '🤝',
      text: `${drawPct}% of group-stage predictions end in a draw.`
    });

    const cleanSheets = groupPicks.filter(
      (p) => p.pick.homeScore === 0 || p.pick.awayScore === 0
    ).length;
    const cleanPct = Math.round((cleanSheets / groupPicks.length) * 100);
    facts.push({
      icon: '🧤',
      text: `${cleanPct}% of group picks have at least one clean sheet.`
    });
  }

  const totalGoals = allViewablePicks.reduce(
    (sum, p) => sum + p.pick.homeScore + p.pick.awayScore,
    0
  );
  const avgGoals = (totalGoals / allViewablePicks.length).toFixed(1);
  facts.push({
    icon: '⚽',
    text: `Average predicted goals per match: ${avgGoals}.`
  });

  if (matchConsensus.length > 0) {
    const goalFest = [...matchConsensus].sort((a, b) => {
      const avgA =
        a.topScorelines.reduce((s, t) => s + t.count, 0) > 0
          ? allViewablePicks
              .filter((p) => p.matchId === a.matchId)
              .reduce((s, p) => s + p.pick.homeScore + p.pick.awayScore, 0) / a.totalPicks
          : 0;
      const avgB =
        allViewablePicks
          .filter((p) => p.matchId === b.matchId)
          .reduce((s, p) => s + p.pick.homeScore + p.pick.awayScore, 0) / b.totalPicks;
      return avgB - avgA;
    })[0];

    if (goalFest && goalFest.totalPicks > 0) {
      const picks = allViewablePicks.filter((p) => p.matchId === goalFest.matchId);
      const avg = (
        picks.reduce((s, p) => s + p.pick.homeScore + p.pick.awayScore, 0) / picks.length
      ).toFixed(1);
      const home = teams.find((t) => t.id === goalFest.homeTeamId);
      const away = teams.find((t) => t.id === goalFest.awayTeamId);
      facts.push({
        icon: '🔥',
        text: `${home?.name ?? goalFest.homeTeamId} vs ${away?.name ?? goalFest.awayTeamId} is the predicted goal fest (${avg} goals per pick on average).`
      });
    }
  }

  if (groupConsensus.length > 0) {
    const whisperer = [...groupConsensus].sort((a, b) => b.modalPct - a.modalPct)[0];
    if (whisperer && whisperer.modalCount > 0) {
      facts.push({
        icon: '📊',
        text: `Group ${whisperer.groupId} has the strongest consensus — ${whisperer.modalPct}% of players predict the same full standings order.`
      });
    }

    const chaos = [...groupConsensus].sort((a, b) => b.distinctWinners - a.distinctWinners)[0];
    if (chaos && chaos.distinctWinners > 1) {
      facts.push({
        icon: '🎲',
        text: `Group ${chaos.groupId} is the most unpredictable — ${chaos.distinctWinners} different teams are tipped to win it.`
      });
    }
  }

  if (tournamentOutlook.visible && tournamentOutlook.champion.length > 0) {
    const top = tournamentOutlook.champion[0];
    facts.push({
      icon: '🏆',
      text: `${top.label} is the runaway champion pick (${top.count} player${top.count === 1 ? '' : 's'}).`
    });
  }

  const pickKeyCounts = new Map<
    string,
    { count: number; playerName?: string; matchLabel?: string }
  >();
  for (const entry of allViewablePicks) {
    const key = `${entry.matchId}:${pickKey(entry.pick, entry.stage, entry)}`;
    const existing = pickKeyCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      const home = teams.find((t) => t.id === entry.homeTeamId);
      const away = teams.find((t) => t.id === entry.awayTeamId);
      pickKeyCounts.set(key, {
        count: 1,
        playerName: entry.displayName,
        matchLabel: `${home?.name ?? entry.homeTeamId} vs ${away?.name ?? entry.awayTeamId}`
      });
    }
  }

  for (const [, data] of pickKeyCounts) {
    if (data.count === 1 && data.playerName && data.matchLabel) {
      facts.push({
        icon: '🦄',
        text: `Only ${data.playerName} predicted a unique scoreline for ${data.matchLabel}.`
      });
      break;
    }
  }

  for (const group of groupConsensus) {
    if (group.positionPopularity[0]?.teams[0]) {
      const winner = group.positionPopularity[0].teams[0];
      if (winner.count === 1 && winner.pct <= 15) {
        const loneUser = userPicks.find((u) => {
          const positions = computeGroupPositions(group.groupId, u.picks);
          return positions[0] && teams.find((t) => t.name === winner.label)?.id === positions[0];
        });
        if (loneUser) {
          facts.push({
            icon: '🌶️',
            text: `Only ${loneUser.displayName} has ${winner.label} winning Group ${group.groupId}.`
          });
          break;
        }
      }
    }
  }

  return facts.slice(0, 6);
}

export function sortMatchConsensusForDisplay(items: MatchConsensusItem[]): {
  mostUnanimous: MatchConsensusItem[];
  mostSplit: MatchConsensusItem[];
} {
  const byUnanimous = [...items].sort(
    (a, b) => b.modePct - a.modePct || b.totalPicks - a.totalPicks
  );
  const bySplit = [...items].sort(
    (a, b) => b.distinctScorelines - a.distinctScorelines || b.totalPicks - a.totalPicks
  );
  return {
    mostUnanimous: byUnanimous.slice(0, 3),
    mostSplit: bySplit.slice(0, 2)
  };
}
