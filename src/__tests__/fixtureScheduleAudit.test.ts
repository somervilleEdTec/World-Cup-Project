import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildKnockoutMatches } from '../lib/bracketEngine';
import { formatKickoffBst } from '../lib/formatDateTime';
import { getMatches } from '../lib/matchResolver';
import {
  OFFICIAL_KICKOFFS,
  OFFICIAL_KICKOFF_COUNT,
  officialKickoffFor
} from '../data/officialKickoffs';
import { GROUP_STAGE_KICKOFFS } from '../data/groupStageKickoffs';
import { KNOCKOUT_STAGE_KICKOFFS } from '../data/knockoutStageKickoffs';
import { groupMatches } from '../data/tournament';

/** Legacy wrong kickoffs from the removed per-group offset formula. */
const LEGACY_WRONG_KICKOFFS: Record<string, string> = {
  'g-a-1': '2026-06-11T16:00:00.000Z',
  'g-a-3': '2026-06-12T16:00:00.000Z',
  'g-l-1': '2026-06-22T16:00:00.000Z'
};

describe('fixture schedule audit — all 104 official kickoffs', () => {
  it('defines exactly 104 official kickoffs (72 group + 32 knockout)', () => {
    expect(Object.keys(GROUP_STAGE_KICKOFFS)).toHaveLength(72);
    expect(Object.keys(KNOCKOUT_STAGE_KICKOFFS)).toHaveLength(32);
    expect(OFFICIAL_KICKOFF_COUNT).toBe(104);
  });

  it('resolves every group and knockout match through getMatches with official kickoffs', () => {
    const matches = getMatches({}, {});
    expect(matches).toHaveLength(104);
    for (const match of matches) {
      expect(match.kickoff).toBe(OFFICIAL_KICKOFFS[match.id]);
      expect(match.kickoff).not.toBe(LEGACY_WRONG_KICKOFFS[match.id]);
    }
  });

  it('does not use legacy wrong kickoffs anywhere in the schedule', () => {
    for (const [id, wrong] of Object.entries(LEGACY_WRONG_KICKOFFS)) {
      expect(officialKickoffFor(id)).not.toBe(wrong);
    }
  });

  it('buildKnockoutMatches uses official FIFA knockout kickoffs', () => {
    const ko = buildKnockoutMatches({}, {});
    expect(ko).toHaveLength(32);
    for (const match of ko) {
      expect(match.kickoff).toBe(KNOCKOUT_STAGE_KICKOFFS[match.id]);
    }
  });

  it('static groupMatches match GROUP_STAGE_KICKOFFS (no inline formula)', () => {
    for (const match of groupMatches) {
      expect(match.kickoff).toBe(GROUP_STAGE_KICKOFFS[match.id]);
    }
  });
});

describe('BST display audit', () => {
  it('formats opening match as 20:00 BST in June (Europe/London)', () => {
    expect(formatKickoffBst('2026-06-11T19:00:00.000Z')).toContain('20:00');
    expect(formatKickoffBst('2026-06-11T19:00:00.000Z')).toMatch(/BST$/);
  });

  it('FixturePickCard uses formatKickoffBst for kickoff labels', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/FixturePickCard.tsx'), 'utf8');
    expect(src).toMatch(/formatKickoffBst\(match\.kickoff\)/);
    expect(src).not.toMatch(/toLocaleString/);
  });

  it('ComparisonPage uses formatKickoffBst for all fixture kickoffs', () => {
    const src = readFileSync(join(process.cwd(), 'src/pages/ComparisonPage.tsx'), 'utf8');
    expect(src).toMatch(/formatKickoffBst\(fixture\.kickoff\)/);
    expect(src).toMatch(/formatKickoffBst\(data\.match\.kickoff\)/);
  });

  it('AdminPage uses formatOptionalKickoffBst for sync timestamps', () => {
    const src = readFileSync(join(process.cwd(), 'src/pages/AdminPage.tsx'), 'utf8');
    expect(src).toMatch(/formatOptionalKickoffBst/);
  });
});
