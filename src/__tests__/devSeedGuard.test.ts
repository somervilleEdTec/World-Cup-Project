import { afterEach, describe, expect, it } from 'vitest';
import { assertDevSeedAllowed } from '../../scripts/lib/devSeedGuard.js';

describe('assertDevSeedAllowed', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('allows seed when DEBUG_LOCAL and ALLOW_KO_SEED are set', () => {
    process.env.DEBUG_LOCAL = '1';
    process.env.ALLOW_KO_SEED = '1';
    expect(() => assertDevSeedAllowed('test')).not.toThrow();
  });

  it('blocks seed in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DEBUG_LOCAL = '1';
    process.env.ALLOW_KO_SEED = '1';
    expect(() => assertDevSeedAllowed('test')).toThrow(/disabled when NODE_ENV=production/i);
  });

  it('blocks seed without DEBUG_LOCAL', () => {
    delete process.env.NODE_ENV;
    delete process.env.DEBUG_LOCAL;
    process.env.ALLOW_KO_SEED = '1';
    expect(() => assertDevSeedAllowed('test')).toThrow(/DEBUG_LOCAL=1/i);
  });

  it('blocks seed without ALLOW_KO_SEED', () => {
    process.env.DEBUG_LOCAL = '1';
    delete process.env.ALLOW_KO_SEED;
    expect(() => assertDevSeedAllowed('test')).toThrow(/ALLOW_KO_SEED=1/i);
  });
});
