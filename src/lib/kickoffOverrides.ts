const FALLBACK_FIRST_KICKOFF = '2026-06-11T19:00:00Z';

let kickoffOverrides: Record<string, string> = {};
let firstMatchKickoff = FALLBACK_FIRST_KICKOFF;

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
  firstMatchKickoff = FALLBACK_FIRST_KICKOFF;
}
