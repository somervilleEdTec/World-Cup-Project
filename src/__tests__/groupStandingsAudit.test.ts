import { describe, it, expect } from 'vitest';
import { computeGroupStandings } from '../lib/groupStandings';
import { actualStandingsOptions, cumulativeDeductionPointsFromSnapshot } from '../lib/fairPlay';
import { teams } from '../data/tournament';
import { Pick } from '../types';

/**
 * Official group-stage scores from Wikipedia/FIFA group pages.
 * Source: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup
 * Last verified: 2026-06-21 (through MD2 for most groups; MD1 for G/H and some others).
 * Regenerate discipline if fair-play tiebreakers drift: npm run generate:discipline
 */
const WIKIPEDIA_SCORES: Record<string, [number, number]> = {
  'g-a-1': [2, 0],
  'g-a-2': [2, 1],
  'g-a-3': [1, 0],
  'g-a-4': [1, 1],
  'g-b-1': [1, 1],
  'g-b-2': [1, 1],
  'g-b-3': [6, 0],
  'g-b-4': [4, 1],
  'g-c-1': [1, 1],
  'g-c-2': [0, 1],
  'g-c-3': [3, 0],
  'g-c-4': [0, 1],
  'g-d-1': [4, 1],
  'g-d-2': [2, 0],
  'g-d-3': [2, 0],
  'g-d-4': [0, 1],
  'g-e-1': [7, 1],
  'g-e-2': [1, 0],
  'g-e-3': [2, 1],
  'g-e-4': [0, 0],
  'g-f-1': [2, 2],
  'g-f-2': [5, 1],
  'g-f-3': [5, 1],
  'g-f-4': [0, 4],
  'g-g-1': [1, 1],
  'g-g-2': [2, 2],
  'g-h-1': [0, 0],
  'g-h-2': [1, 1],
  'g-i-1': [3, 1],
  'g-i-2': [1, 4],
  'g-j-1': [3, 0],
  'g-j-2': [3, 1],
  'g-k-1': [1, 1],
  'g-k-2': [1, 3],
  'g-l-1': [4, 2],
  'g-l-2': [1, 0]
};

/** Expected 1→4 order per Wikipedia/FIFA standings tables (2026-06-21). */
const WIKIPEDIA_STANDINGS: Record<string, string[]> = {
  A: ['mexico', 'south-korea', 'czechia', 'south-africa'],
  B: ['canada', 'switzerland', 'bosnia-and-herzegovina', 'qatar'],
  C: ['brazil', 'morocco', 'scotland', 'haiti'],
  D: ['united-states', 'australia', 'paraguay', 'turkiye'],
  E: ['germany', 'ivory-coast', 'ecuador', 'curacao'],
  F: ['netherlands', 'japan', 'sweden', 'tunisia'],
  G: ['new-zealand', 'iran', 'belgium', 'egypt'],
  H: ['uruguay', 'saudi-arabia', 'spain', 'cape-verde'],
  I: ['norway', 'france', 'senegal', 'iraq'],
  J: ['argentina', 'austria', 'jordan', 'algeria'],
  K: ['colombia', 'dr-congo', 'portugal', 'uzbekistan'],
  L: ['england', 'ghana', 'panama', 'croatia']
};

function picksFromScores(scores: Record<string, [number, number]>): Record<string, Pick> {
  return Object.fromEntries(
    Object.entries(scores).map(([matchId, [homeScore, awayScore]]) => [
      matchId,
      { matchId, homeScore, awayScore }
    ])
  );
}

function teamName(teamId: string): string {
  return teams.find((team) => team.id === teamId)?.name ?? teamId;
}

describe('groupStandingsAudit (Wikipedia/FIFA)', () => {
  const picks = picksFromScores(WIKIPEDIA_SCORES);
  const options = actualStandingsOptions(picks, {});

  for (const groupId of 'ABCDEFGHIJKL') {
    it(`Group ${groupId} matches Wikipedia/FIFA order`, () => {
      const rows = computeGroupStandings(groupId, picks, options);
      const got = rows.map((row) => row.teamId);
      const expected = WIKIPEDIA_STANDINGS[groupId]!;
      expect(got).toEqual(expected);
    });
  }

  it('reports readable order on failure (sanity)', () => {
    const rows = computeGroupStandings('G', picks, options);
    expect(rows.map((row) => teamName(row.teamId)).join(' > ')).toBe(
      'New Zealand > Iran > Belgium > Egypt'
    );
  });
});

describe('fairPlayAudit (Wikipedia Group D discipline totals)', () => {
  /** Wikipedia Group D discipline table totals (2026-06-19). */
  it('matches Wikipedia cumulative deductions for Paraguay and Turkiye', () => {
    const totals = cumulativeDeductionPointsFromSnapshot();
    expect(totals['paraguay']).toBe(11);
    expect(totals['turkiye']).toBe(3);
  });
});
