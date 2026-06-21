import { groupMatches, teams } from '../data/tournament';
import { officialKickoffFor } from '../data/officialKickoffs';
import { THIRD_PLACE_MAPPINGS, ThirdPlaceSlot } from '../data/thirdPlaceMappings';
import { ActualResult, Match, Pick, Stage, TournamentBonusPick } from '../types';
import { compareThirdPlaceStats, computeGroupStandings, StandingsOptions } from './groupStandings';
import { actualStandingsOptions } from './fairPlay';

const GROUPS = 'ABCDEFGHIJKL'.split('');

export interface GroupQualifier {
  group: string;
  position: 1 | 2 | 3;
  teamId: string;
  pts: number;
  gd: number;
  gf: number;
}

type SlotRef =
  | { kind: 'pos'; group: string; position: 1 | 2 }
  | { kind: 'third'; slot: ThirdPlaceSlot }
  | { kind: 'winner'; matchId: string }
  | { kind: 'loser'; matchId: string };

interface KoTemplate {
  id: string;
  stage: Stage;
  home: SlotRef;
  away: SlotRef;
}

const R32_TEMPLATES: KoTemplate[] = [
  {
    id: 'r32-1',
    stage: 'R32',
    home: { kind: 'pos', group: 'A', position: 2 },
    away: { kind: 'pos', group: 'B', position: 2 }
  },
  {
    id: 'r32-2',
    stage: 'R32',
    home: { kind: 'pos', group: 'E', position: 1 },
    away: { kind: 'third', slot: '1E' }
  },
  {
    id: 'r32-3',
    stage: 'R32',
    home: { kind: 'pos', group: 'F', position: 1 },
    away: { kind: 'pos', group: 'C', position: 2 }
  },
  {
    id: 'r32-4',
    stage: 'R32',
    home: { kind: 'pos', group: 'C', position: 1 },
    away: { kind: 'pos', group: 'F', position: 2 }
  },
  {
    id: 'r32-5',
    stage: 'R32',
    home: { kind: 'pos', group: 'I', position: 1 },
    away: { kind: 'third', slot: '1I' }
  },
  {
    id: 'r32-6',
    stage: 'R32',
    home: { kind: 'pos', group: 'E', position: 2 },
    away: { kind: 'pos', group: 'I', position: 2 }
  },
  {
    id: 'r32-7',
    stage: 'R32',
    home: { kind: 'pos', group: 'A', position: 1 },
    away: { kind: 'third', slot: '1A' }
  },
  {
    id: 'r32-8',
    stage: 'R32',
    home: { kind: 'pos', group: 'L', position: 1 },
    away: { kind: 'third', slot: '1L' }
  },
  {
    id: 'r32-9',
    stage: 'R32',
    home: { kind: 'pos', group: 'D', position: 1 },
    away: { kind: 'third', slot: '1D' }
  },
  {
    id: 'r32-10',
    stage: 'R32',
    home: { kind: 'pos', group: 'G', position: 1 },
    away: { kind: 'third', slot: '1G' }
  },
  {
    id: 'r32-11',
    stage: 'R32',
    home: { kind: 'pos', group: 'K', position: 2 },
    away: { kind: 'pos', group: 'L', position: 2 }
  },
  {
    id: 'r32-12',
    stage: 'R32',
    home: { kind: 'pos', group: 'H', position: 1 },
    away: { kind: 'pos', group: 'J', position: 2 }
  },
  {
    id: 'r32-13',
    stage: 'R32',
    home: { kind: 'pos', group: 'B', position: 1 },
    away: { kind: 'third', slot: '1B' }
  },
  {
    id: 'r32-14',
    stage: 'R32',
    home: { kind: 'pos', group: 'J', position: 1 },
    away: { kind: 'pos', group: 'H', position: 2 }
  },
  {
    id: 'r32-15',
    stage: 'R32',
    home: { kind: 'pos', group: 'K', position: 1 },
    away: { kind: 'third', slot: '1K' }
  },
  {
    id: 'r32-16',
    stage: 'R32',
    home: { kind: 'pos', group: 'D', position: 2 },
    away: { kind: 'pos', group: 'G', position: 2 }
  }
];

const LATER_KO_TEMPLATES: KoTemplate[] = [
  {
    id: 'r16-1',
    stage: 'R16',
    home: { kind: 'winner', matchId: 'r32-2' },
    away: { kind: 'winner', matchId: 'r32-5' }
  },
  {
    id: 'r16-2',
    stage: 'R16',
    home: { kind: 'winner', matchId: 'r32-1' },
    away: { kind: 'winner', matchId: 'r32-3' }
  },
  {
    id: 'r16-3',
    stage: 'R16',
    home: { kind: 'winner', matchId: 'r32-11' },
    away: { kind: 'winner', matchId: 'r32-12' }
  },
  {
    id: 'r16-4',
    stage: 'R16',
    home: { kind: 'winner', matchId: 'r32-9' },
    away: { kind: 'winner', matchId: 'r32-10' }
  },
  {
    id: 'r16-5',
    stage: 'R16',
    home: { kind: 'winner', matchId: 'r32-4' },
    away: { kind: 'winner', matchId: 'r32-6' }
  },
  {
    id: 'r16-6',
    stage: 'R16',
    home: { kind: 'winner', matchId: 'r32-7' },
    away: { kind: 'winner', matchId: 'r32-8' }
  },
  {
    id: 'r16-7',
    stage: 'R16',
    home: { kind: 'winner', matchId: 'r32-14' },
    away: { kind: 'winner', matchId: 'r32-16' }
  },
  {
    id: 'r16-8',
    stage: 'R16',
    home: { kind: 'winner', matchId: 'r32-13' },
    away: { kind: 'winner', matchId: 'r32-15' }
  },
  {
    id: 'qf-1',
    stage: 'QF',
    home: { kind: 'winner', matchId: 'r16-1' },
    away: { kind: 'winner', matchId: 'r16-2' }
  },
  {
    id: 'qf-2',
    stage: 'QF',
    home: { kind: 'winner', matchId: 'r16-3' },
    away: { kind: 'winner', matchId: 'r16-4' }
  },
  {
    id: 'qf-3',
    stage: 'QF',
    home: { kind: 'winner', matchId: 'r16-5' },
    away: { kind: 'winner', matchId: 'r16-6' }
  },
  {
    id: 'qf-4',
    stage: 'QF',
    home: { kind: 'winner', matchId: 'r16-7' },
    away: { kind: 'winner', matchId: 'r16-8' }
  },
  {
    id: 'sf-1',
    stage: 'SF',
    home: { kind: 'winner', matchId: 'qf-1' },
    away: { kind: 'winner', matchId: 'qf-2' }
  },
  {
    id: 'sf-2',
    stage: 'SF',
    home: { kind: 'winner', matchId: 'qf-3' },
    away: { kind: 'winner', matchId: 'qf-4' }
  },
  {
    id: 'third-place',
    stage: 'THIRD_PLACE',
    home: { kind: 'loser', matchId: 'sf-1' },
    away: { kind: 'loser', matchId: 'sf-2' }
  },
  {
    id: 'final',
    stage: 'FINAL',
    home: { kind: 'winner', matchId: 'sf-1' },
    away: { kind: 'winner', matchId: 'sf-2' }
  }
];

export const KNOCKOUT_TEMPLATES: KoTemplate[] = [...R32_TEMPLATES, ...LATER_KO_TEMPLATES];

function buildThirdPlaceQualifier(
  groupId: string,
  picks: Record<string, Pick>,
  standingsOptions?: StandingsOptions
): GroupQualifier | null {
  if (!isGroupFullyPlayedInPicks(groupId, picks)) return null;
  const standings = computeGroupStandings(groupId, picks, standingsOptions);
  if (standings.length < 3) return null;
  const third = standings[2];
  return {
    group: groupId,
    position: 3,
    teamId: third.teamId,
    pts: third.pts,
    gd: third.gd,
    gf: third.gf
  };
}

export function rankThirdPlaceTeams(
  picks: Record<string, Pick>,
  standingsOptions?: StandingsOptions
): GroupQualifier[] {
  const thirds = GROUPS.map((g) => buildThirdPlaceQualifier(g, picks, standingsOptions)).filter(
    (q): q is GroupQualifier => q !== null
  );
  return thirds.sort((a, b) => compareThirdPlaceStats(a, b, standingsOptions));
}

export function thirdPlaceCombinationKey(qualifiers: GroupQualifier[]): string {
  return qualifiers
    .map((q) => q.group)
    .sort()
    .join('');
}

export function resolveThirdPlaceTeam(
  slot: ThirdPlaceSlot,
  picks: Record<string, Pick>,
  standingsOptions?: StandingsOptions
): string | null {
  const allGroupsPlayed = GROUPS.every((groupId) => isGroupFullyPlayedInPicks(groupId, picks));
  if (!allGroupsPlayed) return null;
  const ranked = rankThirdPlaceTeams(picks, standingsOptions);
  const topEight = ranked.slice(0, 8);
  if (topEight.length < 8) return null;
  const key = thirdPlaceCombinationKey(topEight);
  const mapping = THIRD_PLACE_MAPPINGS[key];
  if (!mapping) return null;
  const sourceGroup = mapping[slot].replace('3', '');
  const entry = topEight.find((q) => q.group === sourceGroup);
  return entry?.teamId ?? null;
}

function isGroupFullyPlayedInPicks(group: string, picks: Record<string, Pick>): boolean {
  const matches = groupMatches.filter((m) => m.group === group);
  return matches.length > 0 && matches.every((m) => picks[m.id] !== undefined);
}

function resolvePos(
  group: string,
  position: 1 | 2,
  picks: Record<string, Pick>,
  standingsOptions?: StandingsOptions
): string | null {
  if (!isGroupFullyPlayedInPicks(group, picks)) return null;
  const standings = computeGroupStandings(group, picks, standingsOptions);
  const idx = position - 1;
  return standings[idx]?.teamId ?? null;
}

export function resolveKnockoutWinner(
  match: Match,
  pick: Pick | undefined,
  actual: ActualResult | undefined
): string | null {
  const source = actual
    ? {
        homeScore: actual.homeScore,
        awayScore: actual.awayScore,
        progressingTeamId: actual.progressingTeamId
      }
    : pick
      ? {
          homeScore: pick.homeScore,
          awayScore: pick.awayScore,
          progressingTeamId: pick.progressingTeamId
        }
      : null;

  if (!source) return null;
  if (source.homeScore > source.awayScore) return match.homeTeamId;
  if (source.homeScore < source.awayScore) return match.awayTeamId;
  return source.progressingTeamId ?? null;
}

function resolveSlot(
  slot: SlotRef,
  picks: Record<string, Pick>,
  resolvedMatches: Match[],
  actuals: Record<string, ActualResult>,
  standingsOptions?: StandingsOptions
): string | null {
  if (slot.kind === 'pos') {
    return resolvePos(slot.group, slot.position, picks, standingsOptions);
  }
  if (slot.kind === 'third') {
    return resolveThirdPlaceTeam(slot.slot, picks, standingsOptions);
  }

  const feeder = resolvedMatches.find((m) => m.id === slot.matchId);
  if (!feeder) return null;
  const pick = picks[slot.matchId];
  const actual = actuals[slot.matchId];
  const winner = resolveKnockoutWinner(feeder, pick, actual);
  if (!winner || winner === 'tbd') return null;
  if (slot.kind === 'winner') return winner;
  const loser = winner === feeder.homeTeamId ? feeder.awayTeamId : feeder.homeTeamId;
  return loser === 'tbd' ? null : loser;
}

export function buildKnockoutMatches(
  picks: Record<string, Pick>,
  actuals: Record<string, ActualResult> = {},
  options?: { useFairPlay?: boolean }
): Match[] {
  const standingsOptions: StandingsOptions = options?.useFairPlay
    ? actualStandingsOptions(picks, actuals)
    : { useFairPlay: false };
  const resolved: Match[] = [];

  for (const template of KNOCKOUT_TEMPLATES) {
    const homeTeamId = resolveSlot(template.home, picks, resolved, actuals, standingsOptions);
    const awayTeamId = resolveSlot(template.away, picks, resolved, actuals, standingsOptions);
    resolved.push({
      id: template.id,
      stage: template.stage,
      kickoff: officialKickoffFor(template.id),
      homeTeamId: homeTeamId ?? 'tbd',
      awayTeamId: awayTeamId ?? 'tbd'
    });
  }

  return resolved;
}

export function deriveFinalPlacings(
  picks: Record<string, Pick>,
  actuals: Record<string, ActualResult>
): TournamentBonusPick | undefined {
  const ko = buildKnockoutMatches(picks, actuals);
  const final = ko.find((m) => m.id === 'final');
  const thirdPlace = ko.find((m) => m.id === 'third-place');
  if (!final || !thirdPlace) return undefined;

  const champion = resolveKnockoutWinner(final, picks.final, actuals.final);
  if (!champion || champion === 'tbd') return undefined;
  const runnerUp = champion === final.homeTeamId ? final.awayTeamId : final.homeTeamId;

  const bronzeWinner = resolveKnockoutWinner(
    thirdPlace,
    picks['third-place'],
    actuals['third-place']
  );
  if (!bronzeWinner || bronzeWinner === 'tbd') return undefined;
  const fourth =
    bronzeWinner === thirdPlace.homeTeamId ? thirdPlace.awayTeamId : thirdPlace.homeTeamId;

  if (runnerUp === 'tbd' || fourth === 'tbd') return undefined;

  return {
    winnerTeamId: champion,
    runnerUpTeamId: runnerUp,
    thirdTeamId: bronzeWinner,
    fourthTeamId: fourth
  };
}

export function isGroupStageComplete(picks: Record<string, Pick>): boolean {
  return groupMatches.every((match) => picks[match.id] !== undefined);
}

export function getDownstreamKnockoutMatchIds(changedMatchId: string): string[] {
  if (changedMatchId.startsWith('g-')) {
    return KNOCKOUT_TEMPLATES.map((t) => t.id);
  }

  const downstream = new Set<string>();

  const walk = (matchId: string) => {
    KNOCKOUT_TEMPLATES.forEach((template) => {
      const refs = [template.home, template.away];
      const feeds = refs.some(
        (ref) => (ref.kind === 'winner' || ref.kind === 'loser') && ref.matchId === matchId
      );
      if (feeds && !downstream.has(template.id)) {
        downstream.add(template.id);
        walk(template.id);
      }
    });
  };

  walk(changedMatchId);
  return [...downstream];
}
