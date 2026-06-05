import { formatKickoffBst } from './formatDateTime';
import type { Stage, Team } from '../types';

const KNOCKOUT_STAGE_LABELS: Partial<Record<Stage, string>> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-final',
  SF: 'Semi-final',
  THIRD_PLACE: 'Third-place play-off',
  FINAL: 'Final'
};

/** User-facing stage label for fixtures (Group A, Round of 32, etc.). */
export function formatFixtureStageLabel(stage: Stage | string, group?: string): string {
  if (stage === 'GROUP') {
    return group ? `Group ${group}` : 'Group stage';
  }
  return KNOCKOUT_STAGE_LABELS[stage as Stage] ?? String(stage);
}

export interface FixtureLabelInput {
  id: string;
  stage: Stage | string;
  group?: string;
  kickoff: string;
  homeTeamId: string;
  awayTeamId: string;
}

export function formatFixtureOptionLabel(
  fixture: FixtureLabelInput,
  teams: Team[],
  options?: { includeKickoff?: boolean; includeId?: boolean }
): string {
  const home = teams.find((team) => team.id === fixture.homeTeamId);
  const away = teams.find((team) => team.id === fixture.awayTeamId);
  const stageLabel = formatFixtureStageLabel(fixture.stage, fixture.group);
  const teamsLabel = `${home?.name ?? 'TBD'} vs ${away?.name ?? 'TBD'}`;
  const parts = [stageLabel, teamsLabel];
  if (options?.includeKickoff !== false) {
    parts.push(formatKickoffBst(fixture.kickoff));
  }
  if (options?.includeId) {
    parts.push(fixture.id);
  }
  return parts.join(' — ');
}

export function fixtureSelectGroupLabel(fixture: FixtureLabelInput): string {
  if (fixture.stage === 'GROUP' && fixture.group) {
    return `Group ${fixture.group}`;
  }
  return formatFixtureStageLabel(fixture.stage, fixture.group);
}
