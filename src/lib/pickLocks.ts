import { groupMatches } from '../data/tournament';
import { getFirstMatchKickoff } from './kickoffOverrides';
import { Match } from '../types';

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

export function shouldLockGroup(nowIso = new Date().toISOString()): boolean {
  return kickoffReached(getFirstMatchKickoff(), nowIso);
}

export function isGroupLocked(metaGroupLocked: boolean, nowIso = new Date().toISOString()): boolean {
  return metaGroupLocked || shouldLockGroup(nowIso);
}

export function assertMatchEditable(
  match: Match,
  metaGroupLocked: boolean,
  nowIso = new Date().toISOString()
): void {
  if (isGroupStage(match) && isGroupLocked(metaGroupLocked, nowIso)) {
    throw new Error('Group-stage picks are locked.');
  }
  if (isKnockout(match) && kickoffReached(match.kickoff, nowIso)) {
    throw new Error('This knockout fixture is locked.');
  }
}

export function isMatchEditable(match: Match, metaGroupLocked: boolean, nowIso = new Date().toISOString()): boolean {
  try {
    assertMatchEditable(match, metaGroupLocked, nowIso);
    return true;
  } catch {
    return false;
  }
}

export function assertBonusEditable(metaGroupLocked: boolean, nowIso = new Date().toISOString()): void {
  if (isGroupLocked(metaGroupLocked, nowIso)) {
    throw new Error('Tournament bonus picks are locked.');
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
