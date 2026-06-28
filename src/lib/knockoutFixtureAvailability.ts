import { groupMatches } from '../data/tournament';
import { KNOCKOUT_TEMPLATES, buildKnockoutMatches } from './bracketEngine';
import { picksFromActuals } from './pickUtils';
import { ActualResult, Match } from '../types';

export interface PendingGroupResults {
  groupId: string;
  played: number;
  required: number;
  missingMatchIds: string[];
}

export interface KnockoutUnlockSummary {
  confirmedCount: number;
  pendingGroups: PendingGroupResults[];
  /** R32 slots that include a third-place team — blocked until every group has six results. */
  thirdPlaceSlotsPending: boolean;
  /** Direct group-fed R32 fixtures waiting on incomplete feeding groups. */
  blockedDirectR32MatchIds: string[];
}

export function isGroupCompleteInResults(
  groupId: string,
  actuals: Record<string, ActualResult>
): boolean {
  const matches = groupMatches.filter((m) => m.group === groupId);
  return matches.length > 0 && matches.every((m) => actuals[m.id] !== undefined);
}

/** Knockout fixtures whose home and away are known from official results only. */
export function buildConfirmedKnockoutFixtures(actuals: Record<string, ActualResult>): Match[] {
  const officialPicks = picksFromActuals(actuals);
  return buildKnockoutMatches(officialPicks, actuals, { useFairPlay: true }).filter(
    (match) => match.homeTeamId !== 'tbd' && match.awayTeamId !== 'tbd'
  );
}

export function isKnockoutFixtureConfirmed(
  matchId: string,
  actuals: Record<string, ActualResult>
): boolean {
  return buildConfirmedKnockoutFixtures(actuals).some((match) => match.id === matchId);
}

export function assertKnockoutFixtureConfirmed(
  matchId: string,
  actuals: Record<string, ActualResult>
): void {
  if (!isKnockoutFixtureConfirmed(matchId, actuals)) {
    throw new Error(
      'This knockout fixture is not available yet. It unlocks once both teams are confirmed from official group or knockout results.'
    );
  }
}

function pendingGroupsFromResults(actuals: Record<string, ActualResult>): PendingGroupResults[] {
  return 'ABCDEFGHIJKL'.split('').flatMap((groupId) => {
    const matches = groupMatches.filter((match) => match.group === groupId);
    const missingMatchIds = matches.filter((match) => actuals[match.id] === undefined).map((m) => m.id);
    if (missingMatchIds.length === 0) return [];
    return [
      {
        groupId,
        played: matches.length - missingMatchIds.length,
        required: matches.length,
        missingMatchIds
      }
    ];
  });
}

function blockedDirectR32MatchIds(actuals: Record<string, ActualResult>): string[] {
  const picks = picksFromActuals(actuals);
  const resolved = buildKnockoutMatches(picks, actuals, { useFairPlay: true });
  const confirmedIds = new Set(buildConfirmedKnockoutFixtures(actuals).map((match) => match.id));

  return KNOCKOUT_TEMPLATES.filter((template) => template.stage === 'R32')
    .filter((template) => {
      if (confirmedIds.has(template.id)) return false;
      const usesThirdPlace =
        template.home.kind === 'third' || template.away.kind === 'third';
      if (usesThirdPlace) return false;
      const match = resolved.find((entry) => entry.id === template.id);
      return Boolean(match && (match.homeTeamId === 'tbd' || match.awayTeamId === 'tbd'));
    })
    .map((template) => template.id);
}

/** Explains which official results are still required before more knockout fixtures unlock. */
export function getKnockoutUnlockSummary(
  actuals: Record<string, ActualResult>
): KnockoutUnlockSummary {
  const pendingGroups = pendingGroupsFromResults(actuals);
  return {
    confirmedCount: buildConfirmedKnockoutFixtures(actuals).length,
    pendingGroups,
    thirdPlaceSlotsPending: pendingGroups.length > 0,
    blockedDirectR32MatchIds: blockedDirectR32MatchIds(actuals)
  };
}
