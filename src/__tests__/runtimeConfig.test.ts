import { afterEach, describe, expect, it } from 'vitest';
import {
  getFootballDataToken,
  getResultsMode,
  isDebugLocalMode,
  shouldSyncFootballData
} from '../lib/runtimeConfig';

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

  it('prefers FOOTBALL_DATA_TOKEN over FOOTBALL_API_KEY', () => {
    process.env.FOOTBALL_DATA_TOKEN = ' primary ';
    process.env.FOOTBALL_API_KEY = 'fallback';
    expect(getFootballDataToken()).toBe('primary');
  });

  it('falls back to FOOTBALL_API_KEY when FOOTBALL_DATA_TOKEN is unset', () => {
    delete process.env.DEBUG_LOCAL;
    delete process.env.RESULTS_MODE;
    delete process.env.FOOTBALL_DATA_TOKEN;
    process.env.FOOTBALL_API_KEY = ' api-key ';
    expect(getFootballDataToken()).toBe('api-key');
    expect(shouldSyncFootballData()).toBe(true);
  });
});
