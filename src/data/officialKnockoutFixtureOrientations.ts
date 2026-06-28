import type { ThirdPlaceSlot } from './thirdPlaceMappings';

/**
 * Official FIFA World Cup 2026 knockout home/away slot designations.
 * First-listed team in the FIFA schedule = home; second = away.
 * Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
 * Verified 2026-06-28.
 *
 * Internal match ids map to FIFA match numbers as r32-N => 72+N (r32-1 = 73 … final = 104).
 */
export type OfficialKnockoutSlot =
  | { kind: 'pos'; group: string; position: 1 | 2 }
  | { kind: 'third'; slot: ThirdPlaceSlot }
  | { kind: 'winner'; matchId: string }
  | { kind: 'loser'; matchId: string };

export interface OfficialKnockoutFixtureOrientation {
  fifaMatchNumber: number;
  home: OfficialKnockoutSlot;
  away: OfficialKnockoutSlot;
}

export const OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS: Record<
  string,
  OfficialKnockoutFixtureOrientation
> = {
  'r32-1': {
    fifaMatchNumber: 73,
    home: { kind: 'pos', group: 'A', position: 2 },
    away: { kind: 'pos', group: 'B', position: 2 }
  },
  'r32-2': {
    fifaMatchNumber: 74,
    home: { kind: 'pos', group: 'E', position: 1 },
    away: { kind: 'third', slot: '1E' }
  },
  'r32-3': {
    fifaMatchNumber: 75,
    home: { kind: 'pos', group: 'F', position: 1 },
    away: { kind: 'pos', group: 'C', position: 2 }
  },
  'r32-4': {
    fifaMatchNumber: 76,
    home: { kind: 'pos', group: 'C', position: 1 },
    away: { kind: 'pos', group: 'F', position: 2 }
  },
  'r32-5': {
    fifaMatchNumber: 77,
    home: { kind: 'pos', group: 'I', position: 1 },
    away: { kind: 'third', slot: '1I' }
  },
  'r32-6': {
    fifaMatchNumber: 78,
    home: { kind: 'pos', group: 'E', position: 2 },
    away: { kind: 'pos', group: 'I', position: 2 }
  },
  'r32-7': {
    fifaMatchNumber: 79,
    home: { kind: 'pos', group: 'A', position: 1 },
    away: { kind: 'third', slot: '1A' }
  },
  'r32-8': {
    fifaMatchNumber: 80,
    home: { kind: 'pos', group: 'L', position: 1 },
    away: { kind: 'third', slot: '1L' }
  },
  'r32-9': {
    fifaMatchNumber: 81,
    home: { kind: 'pos', group: 'D', position: 1 },
    away: { kind: 'third', slot: '1D' }
  },
  'r32-10': {
    fifaMatchNumber: 82,
    home: { kind: 'pos', group: 'G', position: 1 },
    away: { kind: 'third', slot: '1G' }
  },
  'r32-11': {
    fifaMatchNumber: 83,
    home: { kind: 'pos', group: 'K', position: 2 },
    away: { kind: 'pos', group: 'L', position: 2 }
  },
  'r32-12': {
    fifaMatchNumber: 84,
    home: { kind: 'pos', group: 'H', position: 1 },
    away: { kind: 'pos', group: 'J', position: 2 }
  },
  'r32-13': {
    fifaMatchNumber: 85,
    home: { kind: 'pos', group: 'B', position: 1 },
    away: { kind: 'third', slot: '1B' }
  },
  'r32-14': {
    fifaMatchNumber: 86,
    home: { kind: 'pos', group: 'J', position: 1 },
    away: { kind: 'pos', group: 'H', position: 2 }
  },
  'r32-15': {
    fifaMatchNumber: 87,
    home: { kind: 'pos', group: 'K', position: 1 },
    away: { kind: 'third', slot: '1K' }
  },
  'r32-16': {
    fifaMatchNumber: 88,
    home: { kind: 'pos', group: 'D', position: 2 },
    away: { kind: 'pos', group: 'G', position: 2 }
  },
  'r16-1': {
    fifaMatchNumber: 89,
    home: { kind: 'winner', matchId: 'r32-2' },
    away: { kind: 'winner', matchId: 'r32-5' }
  },
  'r16-2': {
    fifaMatchNumber: 90,
    home: { kind: 'winner', matchId: 'r32-1' },
    away: { kind: 'winner', matchId: 'r32-3' }
  },
  'r16-3': {
    fifaMatchNumber: 93,
    home: { kind: 'winner', matchId: 'r32-11' },
    away: { kind: 'winner', matchId: 'r32-12' }
  },
  'r16-4': {
    fifaMatchNumber: 94,
    home: { kind: 'winner', matchId: 'r32-9' },
    away: { kind: 'winner', matchId: 'r32-10' }
  },
  'r16-5': {
    fifaMatchNumber: 91,
    home: { kind: 'winner', matchId: 'r32-4' },
    away: { kind: 'winner', matchId: 'r32-6' }
  },
  'r16-6': {
    fifaMatchNumber: 92,
    home: { kind: 'winner', matchId: 'r32-7' },
    away: { kind: 'winner', matchId: 'r32-8' }
  },
  'r16-7': {
    fifaMatchNumber: 95,
    home: { kind: 'winner', matchId: 'r32-14' },
    away: { kind: 'winner', matchId: 'r32-16' }
  },
  'r16-8': {
    fifaMatchNumber: 96,
    home: { kind: 'winner', matchId: 'r32-13' },
    away: { kind: 'winner', matchId: 'r32-15' }
  },
  'qf-1': {
    fifaMatchNumber: 97,
    home: { kind: 'winner', matchId: 'r16-1' },
    away: { kind: 'winner', matchId: 'r16-2' }
  },
  'qf-2': {
    fifaMatchNumber: 98,
    home: { kind: 'winner', matchId: 'r16-3' },
    away: { kind: 'winner', matchId: 'r16-4' }
  },
  'qf-3': {
    fifaMatchNumber: 99,
    home: { kind: 'winner', matchId: 'r16-5' },
    away: { kind: 'winner', matchId: 'r16-6' }
  },
  'qf-4': {
    fifaMatchNumber: 100,
    home: { kind: 'winner', matchId: 'r16-7' },
    away: { kind: 'winner', matchId: 'r16-8' }
  },
  'sf-1': {
    fifaMatchNumber: 101,
    home: { kind: 'winner', matchId: 'qf-1' },
    away: { kind: 'winner', matchId: 'qf-2' }
  },
  'sf-2': {
    fifaMatchNumber: 102,
    home: { kind: 'winner', matchId: 'qf-3' },
    away: { kind: 'winner', matchId: 'qf-4' }
  },
  'third-place': {
    fifaMatchNumber: 103,
    home: { kind: 'loser', matchId: 'sf-1' },
    away: { kind: 'loser', matchId: 'sf-2' }
  },
  final: {
    fifaMatchNumber: 104,
    home: { kind: 'winner', matchId: 'sf-1' },
    away: { kind: 'winner', matchId: 'sf-2' }
  }
};

export const OFFICIAL_KNOCKOUT_FIXTURE_IDS = Object.keys(OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS);
