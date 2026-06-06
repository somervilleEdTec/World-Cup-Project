import { describe, expect, it } from 'vitest';
import { OFFICIAL_GROUP_FIXTURE_ORIENTATIONS } from '../data/officialGroupFixtureOrientations';
import { groupMatches } from '../data/tournament';

describe('group fixture home/away orientations', () => {
  it('defines official FIFA orientations for all 72 group fixtures', () => {
    expect(Object.keys(OFFICIAL_GROUP_FIXTURE_ORIENTATIONS)).toHaveLength(72);
  });

  it('matches FIFA official home/away for every group fixture', () => {
    for (const match of groupMatches) {
      const official = OFFICIAL_GROUP_FIXTURE_ORIENTATIONS[match.id];
      expect(official, `missing official orientation for ${match.id}`).toBeTruthy();
      expect(match.homeTeamId).toBe(official.homeTeamId);
      expect(match.awayTeamId).toBe(official.awayTeamId);
    }
  });

  it('keeps matchday-2 fixture 2 and matchday-3 fixture 1 with team d as home', () => {
    for (const group of 'ABCDEFGHIJKL'.split('')) {
      const fixtures = groupMatches
        .filter((m) => m.group === group)
        .sort((a, b) => Number(a.id.split('-').pop()) - Number(b.id.split('-').pop()));
      const teamD = fixtures[1]!.awayTeamId;
      expect(fixtures[3]!.homeTeamId).toBe(teamD);
      expect(fixtures[4]!.homeTeamId).toBe(teamD);
    }
  });
});
