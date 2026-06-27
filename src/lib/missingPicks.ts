import { groupMatches, teams } from '../data/tournament';
import { ALL_GROUP_IDS } from './pickLocks';
import { sortMatchesByKickoff } from './upcomingFixtures';
import { Match, Pick, TournamentBonusPick } from '../types';

export interface MissingPickItem {
  kind: 'group' | 'knockout' | 'tournament';
  label: string;
}

const TOURNAMENT_SLOTS: Array<{ key: keyof TournamentBonusPick; label: string }> = [
  { key: 'winnerTeamId', label: 'Tournament Place: Winner' },
  { key: 'runnerUpTeamId', label: 'Tournament Place: Runner-up' },
  { key: 'thirdTeamId', label: 'Tournament Place: Third' },
  { key: 'fourthTeamId', label: 'Tournament Place: Fourth' }
];

function teamName(teamId: string): string {
  return teams.find((team) => team.id === teamId)?.name ?? teamId;
}

function formatKnockoutFixture(match: Match): string {
  const home = teamName(match.homeTeamId);
  const away = teamName(match.awayTeamId);
  return `Knockout: ${match.stage} — ${home} vs ${away}`;
}

export function computeMissingPicks(
  picks: Record<string, Pick>,
  bonusCommitted: TournamentBonusPick | undefined,
  confirmedKnockoutFixtures: Match[]
): MissingPickItem[] {
  const missing: MissingPickItem[] = [];

  for (const slot of TOURNAMENT_SLOTS) {
    if (!bonusCommitted?.[slot.key]) {
      missing.push({ kind: 'tournament', label: slot.label });
    }
  }

  for (const groupId of ALL_GROUP_IDS) {
    const matches = groupMatches.filter((match) => match.group === groupId);
    const complete = matches.every((match) => picks[match.id] !== undefined);
    if (!complete) {
      missing.push({ kind: 'group', label: `Group ${groupId}` });
    }
  }

  for (const match of sortMatchesByKickoff(confirmedKnockoutFixtures)) {
    if (picks[match.id] === undefined) {
      missing.push({ kind: 'knockout', label: formatKnockoutFixture(match) });
    }
  }

  return missing;
}
