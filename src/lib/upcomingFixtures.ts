import { Match } from '../types';

/** Chronological match order (kickoff, then stable id tiebreaker). */
export function sortMatchesByKickoff(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.id.localeCompare(b.id));
}

export interface UpcomingKickoffWindows {
  next: Match[];
  secondNext: Match[];
}

/** Earliest and second-earliest upcoming kickoff waves among viewable matches. */
export function getUpcomingKickoffWindows(
  matches: Match[],
  viewableUpcomingMatchIds: Set<string>
): UpcomingKickoffWindows {
  const upcoming = sortMatchesByKickoff(
    matches.filter((match) => viewableUpcomingMatchIds.has(match.id))
  );

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
