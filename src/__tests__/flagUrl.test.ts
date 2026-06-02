import { describe, expect, it } from 'vitest';
import { flagImageUrl } from '../lib/flagUrl';

describe('flagImageUrl', () => {
  it('builds a path to bundled flag SVG assets', () => {
    expect(flagImageUrl('mx')).toBe('/flags/4x3/mx.svg');
    expect(flagImageUrl('GB-ENG')).toBe('/flags/4x3/gb-eng.svg');
  });
});
