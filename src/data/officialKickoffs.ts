import { GROUP_STAGE_KICKOFFS } from './groupStageKickoffs';
import { KNOCKOUT_STAGE_KICKOFFS } from './knockoutStageKickoffs';

/** All 104 fixtures — official FIFA UTC kickoffs (group + knockout). */
export const OFFICIAL_KICKOFFS: Record<string, string> = {
  ...GROUP_STAGE_KICKOFFS,
  ...KNOCKOUT_STAGE_KICKOFFS
};

export const OFFICIAL_KICKOFF_COUNT = Object.keys(OFFICIAL_KICKOFFS).length;

export function officialKickoffFor(matchId: string): string {
  const kickoff = OFFICIAL_KICKOFFS[matchId];
  if (!kickoff) {
    throw new Error(`Missing official kickoff for ${matchId}`);
  }
  return kickoff;
}
