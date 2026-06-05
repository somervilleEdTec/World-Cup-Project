import { GROUP_STAGE_KICKOFFS } from '../data/groupStageKickoffs';

/** Import kickoffs directly — not tournament.ts — to avoid circular init with matchResolver. */
const DEFAULT_FIRST_MATCH_KICKOFF = GROUP_STAGE_KICKOFFS['g-a-1'];

let kickoffOverrides: Record<string, string> = {};
let firstMatchKickoff = DEFAULT_FIRST_MATCH_KICKOFF;

export function getKickoffOverrides(): Readonly<Record<string, string>> {
  return kickoffOverrides;
}

export function getFirstMatchKickoff(): string {
  return firstMatchKickoff;
}

export function setKickoffState(overrides: Record<string, string>, firstKickoff: string): void {
  kickoffOverrides = overrides;
  firstMatchKickoff = firstKickoff;
}

export function resetKickoffState(): void {
  kickoffOverrides = {};
  firstMatchKickoff = DEFAULT_FIRST_MATCH_KICKOFF;
}
