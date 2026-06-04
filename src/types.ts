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

export interface ActualResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  progressingTeamId?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  correctResultPoints: number;
  exactScorePoints: number;
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
