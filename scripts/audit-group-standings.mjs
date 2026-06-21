/**
 * CLI wrapper for Wikipedia/FIFA group standings audit.
 * Run: npm run audit:standings
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npx',
  ['vitest', 'run', 'src/__tests__/groupStandingsAudit.test.ts'],
  { stdio: 'inherit', shell: true }
);

process.exit(result.status ?? 1);
