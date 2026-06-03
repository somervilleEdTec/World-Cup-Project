export type ResultsMode = 'random' | 'none' | 'live';

function envFlag(name: string): boolean {
  const v = process.env[name];
  return v === '1' || v === 'true' || v === 'yes';
}

/** Local Debug hosting — never sync football-data.org even if a token is set. */
export function isDebugLocalMode(): boolean {
  return envFlag('DEBUG_LOCAL');
}

export function getResultsMode(): ResultsMode {
  const mode = process.env.RESULTS_MODE?.toLowerCase();
  if (mode === 'random' || mode === 'none' || mode === 'live') {
    return mode;
  }
  if (isDebugLocalMode()) {
    return 'none';
  }
  if (process.env.FOOTBALL_DATA_TOKEN) {
    return 'live';
  }
  return 'none';
}

/** Whether server/jobs may call football-data.org. */
export function shouldSyncFootballData(): boolean {
  if (isDebugLocalMode()) {
    return false;
  }
  return getResultsMode() === 'live' && Boolean(process.env.FOOTBALL_DATA_TOKEN);
}
