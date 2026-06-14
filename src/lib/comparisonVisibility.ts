import { ActualResult, Match } from '../types';
import { isGroupLocked, kickoffReached, predictionLockReached } from './pickLocks';
import { isGroupStage, isKnockout } from './tournamentLogic';

/** Whether other players' predictions for this fixture may be shown. */
export function canViewOthersPicks(
  match: Match,
  nowIso = new Date().toISOString(),
  /** True when the tournament group phase has locked (DB flag or first kickoff passed). */
  groupPhaseLocked = false
): boolean {
  if (isGroupStage(match)) {
    return isGroupLocked(groupPhaseLocked, nowIso);
  }
  if (isKnockout(match)) {
    return predictionLockReached(match.kickoff, nowIso);
  }
  return false;
}

/** True when the fixture has not kicked off and has no official result. */
export function isUpcomingFixture(
  match: Match,
  nowIso = new Date().toISOString(),
  results: Record<string, ActualResult> = {}
): boolean {
  return !results[match.id] && !kickoffReached(match.kickoff, nowIso);
}

export function getNextUpcomingMatchId(
  nowIso = new Date().toISOString(),
  matchIds: { id: string; kickoff: string }[]
): string | null {
  const upcoming = matchIds
    .filter((m) => new Date(m.kickoff).getTime() > new Date(nowIso).getTime())
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  return upcoming[0]?.id ?? null;
}
