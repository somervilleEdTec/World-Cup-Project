import { Match } from '../types';
import { isGroupLocked, kickoffReached } from './pickLocks';
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
    return kickoffReached(match.kickoff, nowIso);
  }
  return false;
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
