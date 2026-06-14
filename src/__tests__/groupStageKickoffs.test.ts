import { describe, expect, it } from 'vitest';
import { GROUP_STAGE_KICKOFFS } from '../data/groupStageKickoffs';
import { FIRST_MATCH_KICKOFF, groupMatches } from '../data/tournament';

const GROUP_STAGE_START = Date.parse('2026-06-11T00:00:00.000Z');
const GROUP_STAGE_END = Date.parse('2026-06-27T23:59:59.999Z');

function matchNumber(id: string): number {
  return Number(id.split('-').pop());
}

describe('group stage kickoffs', () => {
  it('defines all 72 official FIFA kickoffs', () => {
    expect(Object.keys(GROUP_STAGE_KICKOFFS)).toHaveLength(72);
    for (const match of groupMatches) {
      expect(GROUP_STAGE_KICKOFFS[match.id]).toBe(match.kickoff);
    }
  });

  it('opens with Mexico vs South Africa at 19:00 UTC', () => {
    expect(FIRST_MATCH_KICKOFF).toBe('2026-06-11T19:00:00.000Z');
    expect(groupMatches.find((m) => m.id === 'g-a-1')?.kickoff).toBe(FIRST_MATCH_KICKOFF);
  });

  it('keeps every group fixture inside the official group-stage window', () => {
    for (const match of groupMatches) {
      const ts = Date.parse(match.kickoff);
      expect(ts).toBeGreaterThanOrEqual(GROUP_STAGE_START);
      expect(ts).toBeLessThanOrEqual(GROUP_STAGE_END);
    }
  });

  it('keeps matchday bands in order within each group', () => {
    for (const group of 'ABCDEFGHIJKL'.split('')) {
      const fixtures = groupMatches
        .filter((m) => m.group === group)
        .sort((a, b) => matchNumber(a.id) - matchNumber(b.id));
      const md1 = fixtures.slice(0, 2).map((m) => Date.parse(m.kickoff));
      const md2 = fixtures.slice(2, 4).map((m) => Date.parse(m.kickoff));
      const md3 = fixtures.slice(4, 6).map((m) => Date.parse(m.kickoff));
      expect(Math.min(...md2)).toBeGreaterThanOrEqual(Math.max(...md1));
      expect(Math.min(...md3)).toBeGreaterThanOrEqual(Math.max(...md2));
    }
  });

  it('does not stagger later groups onto later matchday-1 dates', () => {
    const groupLFirst = groupMatches.find((m) => m.id === 'g-l-1');
    expect(groupLFirst?.kickoff).toBe('2026-06-17T20:00:00.000Z');
    expect(Date.parse(groupLFirst!.kickoff)).toBeLessThan(Date.parse('2026-06-18T00:00:00.000Z'));
  });

  it('fixes previously wrong matchday-2 dates for group A', () => {
    expect(groupMatches.find((m) => m.id === 'g-a-3')?.kickoff).toBe('2026-06-19T01:00:00.000Z');
    expect(groupMatches.find((m) => m.id === 'g-a-4')?.kickoff).toBe('2026-06-18T16:00:00.000Z');
  });
});
