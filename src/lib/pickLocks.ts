import { groupMatches } from '../data/tournament';
import { getFirstMatchKickoff } from './kickoffOverrides';
import { ActualResult, Match, Pick } from '../types';

export const GROUP_MATCH_COUNT = groupMatches.length;

export const ALL_GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const KO_STAGES = new Set(['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL']);

export function isGroupStage(match: Match): boolean {
  return match.stage === 'GROUP';
}

export function isKnockout(match: Match): boolean {
  return KO_STAGES.has(match.stage);
}

export function kickoffReached(isoKickoff: string, nowIso = new Date().toISOString()): boolean {
  return new Date(nowIso).getTime() >= new Date(isoKickoff).getTime();
}

/** Knockout picks lock at fixture kickoff; also when an official result exists (match played). */
export function isKnockoutFixtureLocked(
  match: Match,
  nowIso = new Date().toISOString(),
  actual?: ActualResult
): boolean {
  return kickoffReached(match.kickoff, nowIso) || actual !== undefined;
}

export function shouldLockGroup(nowIso = new Date().toISOString()): boolean {
  return kickoffReached(getFirstMatchKickoff(), nowIso);
}

export function isGroupLocked(metaGroupLocked: boolean, nowIso = new Date().toISOString()): boolean {
  return metaGroupLocked || shouldLockGroup(nowIso);
}

export function assertMatchEditable(
  match: Match,
  metaGroupLocked: boolean,
  nowIso = new Date().toISOString(),
  actual?: ActualResult
): void {
  if (isGroupStage(match) && isGroupLocked(metaGroupLocked, nowIso)) {
    throw new Error('Group-stage predictions are locked.');
  }
  if (isKnockout(match) && isKnockoutFixtureLocked(match, nowIso, actual)) {
    throw new Error('This knockout fixture is locked.');
  }
}

export function isMatchEditable(
  match: Match,
  metaGroupLocked: boolean,
  nowIso = new Date().toISOString(),
  actual?: ActualResult
): boolean {
  try {
    assertMatchEditable(match, metaGroupLocked, nowIso, actual);
    return true;
  } catch {
    return false;
  }
}

export function assertBonusEditable(metaGroupLocked: boolean, nowIso = new Date().toISOString()): void {
  if (isGroupLocked(metaGroupLocked, nowIso)) {
    throw new Error('Tournament bonus predictions are locked.');
  }
}

export function allGroupsComplete(picks: Record<string, { matchId: string }>): boolean {
  return ALL_GROUP_IDS.every((groupId) => {
    const matches = groupMatches.filter((m) => m.group === groupId);
    return matches.every((m) => picks[m.id] !== undefined);
  });
}

export function allGroupsAccepted(acceptedGroups: string[]): boolean {
  return ALL_GROUP_IDS.every((groupId) => acceptedGroups.includes(groupId));
}

export function countCommittedGroupPicks(committedPicks: Record<string, Pick>): number {
  return groupMatches.filter((m) => committedPicks[m.id] !== undefined).length;
}

export function allGroupPicksCommitted(committedPicks: Record<string, Pick>): boolean {
  return countCommittedGroupPicks(committedPicks) === GROUP_MATCH_COUNT;
}

/** Enforce FINAL_PLAN: all 72 group picks committed before first kickoff. */
export function assertAllGroupPicksCommitted(
  committedPicks: Record<string, Pick>,
  metaGroupLocked: boolean,
  nowIso = new Date().toISOString()
): void {
  if (isGroupLocked(metaGroupLocked, nowIso)) return;

  const count = countCommittedGroupPicks(committedPicks);
  if (!allGroupPicksCommitted(committedPicks)) {
    throw new Error(
      `All ${GROUP_MATCH_COUNT} group-stage predictions must be saved before first kickoff (currently ${count}/${GROUP_MATCH_COUNT}).`
    );
  }
}
