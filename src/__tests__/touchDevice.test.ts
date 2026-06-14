import { afterEach, describe, expect, it, vi } from 'vitest';
import { isCoarsePointerDevice, shouldClearScoreInputOnFocus } from '../lib/touchDevice';

describe('touchDevice', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('detects coarse pointer devices', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('pointer: coarse'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    expect(isCoarsePointerDevice()).toBe(true);
    expect(shouldClearScoreInputOnFocus(false)).toBe(true);
  });

  it('does not clear on fine pointer without touch', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    expect(shouldClearScoreInputOnFocus(false)).toBe(false);
    expect(shouldClearScoreInputOnFocus(true)).toBe(true);
  });
});
