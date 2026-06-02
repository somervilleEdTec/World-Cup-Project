import { Match } from '../types';
import { isGroupStage, isKnockout, shouldLockGroup } from './tournamentLogic';

/** Whether other players' committed picks for this fixture may be shown. */
export function canViewOthersPicks(match: Match, nowIso = new Date().toISOString()): boolean {
  if (isGroupStage(match)) {
    return shouldLockGroup(nowIso);
  }
  if (isKnockout(match)) {
    return true;
  }
  return false;
}

export function getNextUpcomingMatchId(nowIso = new Date().toISOString(), matchIds: { id: string; kickoff: string }[]): string | null {
  const upcoming = matchIds
    .filter((m) => new Date(m.kickoff).getTime() > new Date(nowIso).getTime())
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  return upcoming[0]?.id ?? null;
}
