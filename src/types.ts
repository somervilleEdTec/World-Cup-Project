export type Stage = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD_PLACE' | 'FINAL';

export interface Team {
  id: string;
  name: string;
  /** flag-icons country code (e.g. mx, gb-eng). */
  countryCode: string;
  group: string;
}

export interface Match {
  id: string;
  stage: Stage;
  group?: string;
  kickoff: string;
  homeTeamId: string;
  awayTeamId: string;
  locked?: boolean;
}

export interface Pick {
  matchId: string;
  homeScore: number;
  awayScore: number;
  progressingTeamId?: string;
  reviewed?: boolean;
}

export interface TournamentBonusPick {
  winnerTeamId: string;
  runnerUpTeamId: string;
  thirdTeamId: string;
  fourthTeamId: string;
}

export interface CommitState {
  version: number;
  committedAt: string;
  groupLocked: boolean;
}

export interface PlayerPredictionState {
  committedPicks: Record<string, Pick>;
  draftPicks: Record<string, Pick>;
  affectedMatches: string[];
  bonusDraft?: TournamentBonusPick;
  bonusCommitted?: TournamentBonusPick;
  commitState: CommitState;
}

export interface TeamDiscipline {
  yellowCards: number;
  secondYellowReds: number;
  directReds: number;
}

export interface MatchDiscipline {
  home: TeamDiscipline;
  away: TeamDiscipline;
}

export interface ActualResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  progressingTeamId?: string;
  /** Card counts for FIFA fair-play tiebreaker (from sync, admin, or static snapshot). */
  discipline?: MatchDiscipline;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  correctResultPoints: number;
  exactScorePoints: number;
  correctResults: number;
  exactScores: number;
  groupPositionPoints: number;
  bonusPoints: number;
  coinFlip?: {
    outcome: 'heads' | 'tails';
    priority: number;
    wonTieBreak?: boolean;
  };
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  meta: {
    tournamentFinalComplete: boolean;
    coinFlip: {
      applied: boolean;
      winnerUserId?: string;
      winnerName?: string;
      tiedUserIds?: string[];
      outcomes?: Array<{
        userId: string;
        name: string;
        outcome: 'heads' | 'tails';
        priority: number;
      }>;
    };
  };
}

export interface ComparisonPickView {
  homeScore: number;
  awayScore: number;
  progressingTeamId?: string;
}

export interface ComparisonEntryView {
  userId: string;
  displayName: string;
  isCurrentUser: boolean;
  pick: ComparisonPickView | null;
  hidden: boolean;
}

export interface StatisticsPickCount {
  label: string;
  count: number;
  pct: number;
  teamId?: string;
}

export type CrowdStatVisualType =
  | 'hero'
  | 'fixture'
  | 'ladder'
  | 'standings'
  | 'podium'
  | 'insight'
  | 'personal'
  | 'volatile'
  | 'cluster';

export type PersonalStatKind =
  | 'ladderMove'
  | 'contrarian'
  | 'nearestRival'
  | 'hiveMind'
  | 'groupDiff';

export interface NearbyFixturePlayer {
  userId: string;
  rank: number;
  displayName: string;
  points: number;
  pick: string;
  isCurrentUser?: boolean;
  tournamentBonus?: TournamentBonusPick;
}

export interface LadderMover {
  displayName: string;
  beforeRank: number;
  afterRank: number;
  delta: number;
}

export type CrowdStatCard =
  | {
      id: string;
      visualType: 'hero';
      kind: 'hero';
      title: string;
      value: string;
      detail: string;
      variant?: 'default' | 'consensus' | 'chaos';
    }
  | {
      id: string;
      visualType: 'insight';
      kind: 'fact';
      icon: string;
      text: string;
      subtitle?: string;
    }
  | {
      id: string;
      visualType: 'insight';
      kind: 'battle';
      matchId: string;
      stage: Stage;
      group?: string;
      homeTeamId: string;
      awayTeamId: string;
      playerA: string;
      playerB: string;
      rankA: number;
      rankB: number;
      pickA: string;
      pickB: string;
      currentUserSide?: 'A' | 'B';
      bonusA?: TournamentBonusPick;
      bonusB?: TournamentBonusPick;
    }
  | {
      id: string;
      visualType: 'fixture';
      kind: 'match';
      matchId: string;
      stage: Stage;
      group?: string;
      homeTeamId: string;
      awayTeamId: string;
      totalPicks: number;
      topScorelines: StatisticsPickCount[];
    }
  | {
      id: string;
      visualType: 'ladder';
      kind: 'ladder';
      matchId: string;
      stage: Stage;
      group?: string;
      homeTeamId: string;
      awayTeamId: string;
      scoreline: string;
      scorelinePct: number;
      movers: LadderMover[];
    }
  | {
      id: string;
      visualType: 'standings';
      kind: 'group';
      variant: 'consensus' | 'divided';
      groupId: string;
      modalPct: number;
      modalCount: number;
      distinctWinners: number;
      modalOrder?: string[];
      modalOrderTeamIds?: string[];
      positions: Array<{ rank: 1 | 2 | 3 | 4; teams: StatisticsPickCount[] }>;
    }
  | {
      id: string;
      visualType: 'personal';
      kind: PersonalStatKind;
      subtitle: string;
      matchId?: string;
      stage?: Stage;
      group?: string;
      homeTeamId?: string;
      awayTeamId?: string;
      scoreline?: string;
      scorelinePct?: number;
      beforeRank?: number;
      afterRank?: number;
      delta?: number;
      yourPick?: string;
      crowdPct?: number;
      nearbyPlayers?: NearbyFixturePlayer[];
      hiveMindPct?: number;
      leagueAvgPct?: number;
      matchCount?: number;
      matchTotal?: number;
      groupId?: string;
      yourOrder?: string[];
      crowdOrder?: string[];
      yourOrderTeamIds?: string[];
      crowdOrderTeamIds?: string[];
    }
  | {
      id: string;
      visualType: 'volatile';
      kind: 'volatile';
      subtitle: string;
      matchId: string;
      stage: Stage;
      group?: string;
      homeTeamId: string;
      awayTeamId: string;
      scoreline: string;
      scorelinePct: number;
      ranksMoved: number;
      maxSwing: number;
    }
  | {
      id: string;
      visualType: 'cluster';
      kind: 'cluster';
      subtitle: string;
      players: Array<{
        userId: string;
        displayName: string;
        rank: number;
        points: number;
        isCurrentUser?: boolean;
      }>;
      pointSpread: number;
    }
  | {
      id: string;
      visualType: 'podium';
      kind: 'outlook';
      slot: 'champion' | 'runnerUp' | 'third' | 'fourth';
      picks: StatisticsPickCount[];
    }
  | {
      id: string;
      visualType: 'insight';
      kind: 'spotlight';
      icon: string;
      text: string;
      subtitle?: string;
    };

export interface StatisticsResponse {
  meta: {
    playerCount: number;
    upcomingFixtureCount: number;
    groupPhaseLocked: boolean;
    message: string;
    cardCount: number;
  };
  crowdCards: CrowdStatCard[];
}

export interface OverallPicksEntry {
  rank: number;
  userId: string;
  name: string;
  bonus?: TournamentBonusPick;
  hidden: boolean;
  isCurrentUser?: boolean;
}

export interface OverallPicksResponse {
  meta: {
    groupPhaseLocked: boolean;
    message: string;
    actualPlacings?: TournamentBonusPick;
  };
  entries: OverallPicksEntry[];
}

export interface MatchComparisonView {
  actualResult?: {
    homeScore: number;
    awayScore: number;
    progressingTeamId?: string;
  } | null;
  match: {
    id: string;
    stage: string;
    group?: string;
    kickoff: string;
    homeTeamId: string;
    awayTeamId: string;
  };
  visibility: {
    canViewOthers: boolean;
    groupLocked: boolean;
    matchLocked: boolean;
    message: string;
  };
  entries: ComparisonEntryView[];
}
