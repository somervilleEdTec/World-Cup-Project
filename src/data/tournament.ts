import { Match, Team } from '../types';
import { GROUP_STAGE_KICKOFFS } from './groupStageKickoffs';
import { TEAM_COUNTRY_CODES } from './teamCountryCodes';

export const FIRST_MATCH_KICKOFF = GROUP_STAGE_KICKOFFS['g-a-1'];

const groupTeamNames: Record<string, [string, string, string, string]> = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Turkiye'],
  E: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama']
};

function idFrom(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export const teams: Team[] = Object.entries(groupTeamNames).flatMap(([group, names]) =>
  names.map((name) => ({
    id: idFrom(name),
    name,
    group,
    countryCode: TEAM_COUNTRY_CODES[name] ?? 'un'
  }))
);

function groupMatchesForGroup(group: string, teamIds: string[]): Match[] {
  const [a, b, c, d] = teamIds;
  // FIFA designates the fourth drawn team (d) as home in matchday-2 fixture 2 and matchday-3 fixture 1.
  const pairs: Array<[string, string]> = [
    [a, b],
    [c, d],
    [a, c],
    [d, b],
    [d, a],
    [b, c]
  ];
  return pairs.map(([homeTeamId, awayTeamId], idx) => {
    const id = `g-${group.toLowerCase()}-${idx + 1}`;
    const kickoff = GROUP_STAGE_KICKOFFS[id];
    if (!kickoff) {
      throw new Error(`Missing official kickoff for ${id}`);
    }
    return {
      id,
      stage: 'GROUP',
      group,
      kickoff,
      homeTeamId,
      awayTeamId
    };
  });
}

const groups = Object.keys(groupTeamNames);
export const groupMatches: Match[] = groups.flatMap((group) => {
  const ids = teams.filter((t) => t.group === group).map((t) => t.id);
  return groupMatchesForGroup(group, ids);
});

export { getMatches } from '../lib/matchResolver';
