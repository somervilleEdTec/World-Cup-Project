import { describe, expect, it } from 'vitest';
import { shouldShowUserError, userFacingError } from '../services/apiClient';

describe('apiClient user errors', () => {
  it('hides JSON parse and HTML proxy failures', () => {
    expect(
      shouldShowUserError('JSON.parse: unexpected character at line 1 column 2 of the JSON data')
    ).toBe(false);
    expect(shouldShowUserError('Unexpected token < in JSON at position 0')).toBe(false);
    expect(shouldShowUserError('API returned HTML instead of JSON (200).')).toBe(false);
    expect(shouldShowUserError('Failed to fetch')).toBe(false);
  });

  it('shows actionable server errors', () => {
    expect(shouldShowUserError('Group A is locked')).toBe(true);
    expect(userFacingError(new Error('Fixture locked'), 'fallback')).toBe('Fixture locked');
    expect(userFacingError(new Error('JSON.parse: bad'), 'fallback')).toBeNull();
  });
});
