import { describe, expect, it } from 'vitest';
import { findInternalMatchIdDryRun } from '../lib/footballDataVerification';
import { GROUP_STAGE_KICKOFFS } from '../data/groupStageKickoffs';

describe('football data verification helpers', () => {
  it('maps Mexico vs South Africa to g-a-1 with FIFA opening kickoff', () => {
    const id = findInternalMatchIdDryRun('Mexico', 'South Africa', 'GROUP_A');
    expect(id).toBe('g-a-1');
    expect(GROUP_STAGE_KICKOFFS[id!]).toBe('2026-06-11T19:00:00.000Z');
  });

  it('maps England vs Croatia in Group L', () => {
    const id = findInternalMatchIdDryRun('England', 'Croatia', 'GROUP_L');
    expect(id).toBe('g-l-1');
    expect(GROUP_STAGE_KICKOFFS[id!]).toBe('2026-06-17T20:00:00.000Z');
  });
});
