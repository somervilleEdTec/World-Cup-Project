import { Match } from '../types';

export interface UpcomingKickoffWindows {
  next: Match[];
  secondNext: Match[];
}

/** Earliest and second-earliest upcoming kickoff waves among viewable matches. */
export function getUpcomingKickoffWindows(
  matches: Match[],
  viewableUpcomingMatchIds: Set<string>
): UpcomingKickoffWindows {
  const upcoming = matches
    .filter((match) => viewableUpcomingMatchIds.has(match.id))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  if (upcoming.length === 0) {
    return { next: [], secondNext: [] };
  }

  const kickoffs = [...new Set(upcoming.map((m) => m.kickoff))].sort();
  const nextKickoff = kickoffs[0];
  const secondKickoff = kickoffs[1];

  return {
    next: upcoming.filter((m) => m.kickoff === nextKickoff),
    secondNext: secondKickoff ? upcoming.filter((m) => m.kickoff === secondKickoff) : []
  };
}

/** Prefer matches from the next window, then second-next. */
export function matchesInKickoffWindows(
  windows: UpcomingKickoffWindows,
  preferSecond = false
): Match[] {
  if (preferSecond && windows.secondNext.length > 0) {
    return windows.secondNext;
  }
  if (windows.next.length > 0) {
    return windows.next;
  }
  return windows.secondNext;
}
