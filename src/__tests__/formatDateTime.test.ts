import { describe, expect, it } from 'vitest';
import { formatKickoffBst } from '../lib/formatDateTime';

describe('formatKickoffBst', () => {
  it('formats in en-GB with BST suffix', () => {
    const label = formatKickoffBst('2026-06-11T19:00:00Z');
    expect(label).toMatch(/BST$/);
    expect(label).toMatch(/2026/);
    expect(label).toContain('20:00');
    expect(label).toMatch(/Thu, 11 Jun 2026/);
  });
});
