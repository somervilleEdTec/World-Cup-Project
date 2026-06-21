import { teams } from './tournament';

/**
 * Frozen FIFA Men's World Ranking for World Cup 2026 tiebreakers.
 *
 * REGULATIONS: FIFA uses the ranking edition published on the opening day of the
 * tournament (11 June 2026). It does NOT update when FIFA publishes later editions
 * (e.g. post-tournament updates).
 *
 * IMPLEMENTATION RULES (do not break):
 * - This file is the ONLY source of FIFA ranking data in the app.
 * - Do NOT fetch live rankings from FIFA, football-data.org, or any other API.
 * - Do NOT store rankings in the database or sync them from external services.
 * - To correct a value, edit this static snapshot and add/adjust regression tests.
 */
export const FIFA_RANKING_EDITION_DATE = '2026-06-11';

/** All 48 World Cup 2026 finalists — ranks as published 11 June 2026. */
export const FIFA_WORLD_RANK_TOURNAMENT_START_2026: Readonly<Record<string, number>> = {
  argentina: 1,
  spain: 2,
  france: 3,
  england: 4,
  portugal: 5,
  brazil: 6,
  morocco: 7,
  netherlands: 8,
  belgium: 9,
  germany: 10,
  croatia: 11,
  colombia: 13,
  mexico: 14,
  senegal: 15,
  uruguay: 16,
  'united-states': 17,
  japan: 18,
  switzerland: 19,
  iran: 20,
  turkiye: 22,
  ecuador: 23,
  austria: 24,
  'south-korea': 25,
  australia: 27,
  algeria: 28,
  egypt: 29,
  canada: 30,
  norway: 31,
  'ivory-coast': 33,
  panama: 34,
  sweden: 38,
  czechia: 40,
  paraguay: 41,
  scotland: 42,
  tunisia: 45,
  'dr-congo': 46,
  uzbekistan: 50,
  qatar: 56,
  iraq: 57,
  'south-africa': 60,
  'saudi-arabia': 61,
  jordan: 63,
  'bosnia-and-herzegovina': 64,
  'cape-verde': 67,
  ghana: 73,
  curacao: 82,
  haiti: 83,
  'new-zealand': 85
};

/** Lower rank number is better. Unknown teams sort last (should not occur for finals teams). */
export function fifaWorldRankTournamentStart2026(teamId: string): number {
  return FIFA_WORLD_RANK_TOURNAMENT_START_2026[teamId] ?? 999;
}

/** Every finals team must have a tournament-start rank (guards incomplete snapshots). */
export function assertTournamentStartRankingCoverage(): void {
  const missing = teams.map((team) => team.id).filter((id) => !(id in FIFA_WORLD_RANK_TOURNAMENT_START_2026));
  if (missing.length > 0) {
    throw new Error(`Missing tournament-start FIFA ranks for: ${missing.join(', ')}`);
  }
}
