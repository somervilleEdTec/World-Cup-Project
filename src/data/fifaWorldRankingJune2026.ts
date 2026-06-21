/**
 * FIFA Men's World Ranking as published 11 June 2026 (World Cup opening day).
 * Used as the final group-stage tiebreaker before draw of lots.
 * Source: FIFA / published pre-tournament rankings for all 48 finals teams.
 */
export const FIFA_WORLD_RANK_JUNE_2026: Readonly<Record<string, number>> = {
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

/** Lower rank number is better. Unknown teams sort last. */
export function fifaWorldRankJune2026(teamId: string): number {
  return FIFA_WORLD_RANK_JUNE_2026[teamId] ?? 999;
}
