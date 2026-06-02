import { afterEach, describe, expect, it } from 'vitest';
import { assertDevSeedAllowed } from '../../scripts/lib/devSeedGuard.js';

describe('assertDevSeedAllowed', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('allows seed when ALLOW_KO_SEED=1', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_KO_SEED = '1';
    expect(() => assertDevSeedAllowed('test')).not.toThrow();
  });

  it('blocks seed in production without ALLOW_KO_SEED', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_KO_SEED;
    expect(() => assertDevSeedAllowed('test')).toThrow(/disabled when NODE_ENV=production/i);
  });

  it('allows seed in development without ALLOW_KO_SEED', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_KO_SEED;
    expect(() => assertDevSeedAllowed('test')).not.toThrow();
  });
});
