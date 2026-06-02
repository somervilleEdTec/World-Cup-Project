/**
 * Blocks local KO test seeds on production unless explicitly allowed.
 * Main/production uses an empty DB + football-data.org for results.
 */
export function assertDevSeedAllowed(scriptName: string): void {
  if (process.env.ALLOW_KO_SEED === '1') return;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${scriptName} is disabled when NODE_ENV=production. ` +
        'On main, use an empty database (npm run db:purge) and FOOTBALL_DATA_TOKEN for live results. ' +
        'For local test data on Debug, set ALLOW_KO_SEED=1.'
    );
  }
}
