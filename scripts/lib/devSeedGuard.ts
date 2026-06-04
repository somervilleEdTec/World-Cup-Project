/**
 * Blocks local KO test seeds on production unless explicitly allowed.
 * Debug branch: set DEBUG_LOCAL=1 and ALLOW_KO_SEED=1 in .env (see .env.debug.example).
 */
export function assertDevSeedAllowed(scriptName: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${scriptName} is disabled when NODE_ENV=production. ` +
        'On main, use an empty database (npm run db:purge) and FOOTBALL_DATA_TOKEN for live results. ' +
        'On Debug, copy .env.debug.example to .env (DEBUG_LOCAL=1, ALLOW_KO_SEED=1).'
    );
  }

  const debugLocal =
    process.env.DEBUG_LOCAL === '1' ||
    process.env.DEBUG_LOCAL === 'true' ||
    process.env.DEBUG_LOCAL === 'yes';

  if (!debugLocal) {
    throw new Error(
      `${scriptName} requires DEBUG_LOCAL=1 in .env (Debug branch local policy). ` +
        'Copy .env.debug.example to .env — see docs/DEBUG.md.'
    );
  }

  if (process.env.ALLOW_KO_SEED !== '1') {
    throw new Error(`${scriptName} requires ALLOW_KO_SEED=1 in .env. See docs/DEBUG.md.`);
  }
}
