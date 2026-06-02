import { Match, Team } from '../types';

export const FIRST_MATCH_KICKOFF = '2026-06-11T19:00:00Z';

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

const flags: Record<string, string> = {
  Mexico: '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', Czechia: '🇨🇿',
  Canada: '🇨🇦', 'Bosnia and Herzegovina': '🇧🇦', Qatar: '🇶🇦', Switzerland: '🇨🇭',
  Brazil: '🇧🇷', Morocco: '🇲🇦', Haiti: '🇭🇹', Scotland: '🏴',
  'United States': '🇺🇸', Paraguay: '🇵🇾', Australia: '🇦🇺', Turkiye: '🇹🇷',
  Germany: '🇩🇪', Curacao: '🇨🇼', 'Ivory Coast': '🇨🇮', Ecuador: '🇪🇨',
  Netherlands: '🇳🇱', Japan: '🇯🇵', Sweden: '🇸🇪', Tunisia: '🇹🇳',
  Belgium: '🇧🇪', Egypt: '🇪🇬', Iran: '🇮🇷', 'New Zealand': '🇳🇿',
  Spain: '🇪🇸', 'Cape Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', Uruguay: '🇺🇾',
  France: '🇫🇷', Senegal: '🇸🇳', Iraq: '🇮🇶', Norway: '🇳🇴',
  Argentina: '🇦🇷', Algeria: '🇩🇿', Austria: '🇦🇹', Jordan: '🇯🇴',
  Portugal: '🇵🇹', 'DR Congo': '🇨🇩', Uzbekistan: '🇺🇿', Colombia: '🇨🇴',
  England: '🏴', Croatia: '🇭🇷', Ghana: '🇬🇭', Panama: '🇵🇦'
};

function idFrom(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export const teams: Team[] = Object.entries(groupTeamNames).flatMap(([group, names]) =>
  names.map((name) => ({ id: idFrom(name), name, group, flag: flags[name] ?? '🏳️' }))
);

function groupMatchesForGroup(group: string, teamIds: string[], offsetDays: number): Match[] {
  const [a, b, c, d] = teamIds;
  const pairs: Array<[string, string]> = [
    [a, b], [c, d], [a, c], [b, d], [a, d], [b, c]
  ];
  return pairs.map(([homeTeamId, awayTeamId], idx) => ({
    id: `g-${group.toLowerCase()}-${idx + 1}`,
    stage: 'GROUP',
    group,
    kickoff: new Date(Date.UTC(2026, 5, 11 + offsetDays + Math.floor(idx / 2), (idx % 2) * 3 + 16, 0, 0)).toISOString(),
    homeTeamId,
    awayTeamId
  }));
}

const groups = Object.keys(groupTeamNames);
export const groupMatches: Match[] = groups.flatMap((group, index) => {
  const ids = teams.filter((t) => t.group === group).map((t) => t.id);
  return groupMatchesForGroup(group, ids, index);
});

export { getMatches } from '../lib/matchResolver';
