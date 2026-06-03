import { afterEach, describe, expect, it } from 'vitest';
import { getResultsMode, isDebugLocalMode, shouldSyncFootballData } from '../lib/runtimeConfig';

const env = process.env;

afterEach(() => {
  process.env = { ...env };
});

describe('runtimeConfig', () => {
  it('treats DEBUG_LOCAL as local-only', () => {
    process.env.DEBUG_LOCAL = '1';
    process.env.FOOTBALL_DATA_TOKEN = 'token';
    expect(isDebugLocalMode()).toBe(true);
    expect(shouldSyncFootballData()).toBe(false);
    expect(getResultsMode()).toBe('none');
  });

  it('allows live sync when not debug local and token set', () => {
    delete process.env.DEBUG_LOCAL;
    process.env.RESULTS_MODE = 'live';
    process.env.FOOTBALL_DATA_TOKEN = 'token';
    expect(shouldSyncFootballData()).toBe(true);
  });
});
