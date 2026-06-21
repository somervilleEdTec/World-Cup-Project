import fs from 'node:fs';
import path from 'node:path';
import {
  fetchTransfermarktFairPlayHtml,
  parseTransfermarktFairPlayHtml,
  TRANSFERMARKT_URL,
  validateFairPlayAgainstTransfermarkt
} from '../src/lib/transfermarktFairPlay.js';
import { cumulativeDeductionPointsFromSnapshot } from '../src/lib/fairPlay.js';

const DEFAULT_FIXTURE = path.resolve(
  'scripts/fixtures/transfermarkt-fair-play-FIWC-2026.html'
);

async function loadHtml(): Promise<string> {
  const fileArg = process.argv.find((arg) => arg.startsWith('--file='));
  if (fileArg) {
    const filePath = path.resolve(fileArg.slice('--file='.length));
    return fs.readFileSync(filePath, 'utf8');
  }

  if (process.argv.includes('--offline')) {
    if (!fs.existsSync(DEFAULT_FIXTURE)) {
      throw new Error(
        `Offline mode requires ${DEFAULT_FIXTURE}. Run without --offline or pass --file=PATH.`
      );
    }
    return fs.readFileSync(DEFAULT_FIXTURE, 'utf8');
  }

  try {
    return await fetchTransfermarktFairPlayHtml();
  } catch (error) {
    if (fs.existsSync(DEFAULT_FIXTURE)) {
      // eslint-disable-next-line no-console
      console.warn(
        `Live fetch failed (${error instanceof Error ? error.message : error}); using cached fixture.`
      );
      return fs.readFileSync(DEFAULT_FIXTURE, 'utf8');
    }
    throw error;
  }
}

async function main() {
  const html = await loadHtml();
  const transfermarktRows = parseTransfermarktFairPlayHtml(html);
  const snapshotTotals = cumulativeDeductionPointsFromSnapshot();
  const result = validateFairPlayAgainstTransfermarkt(snapshotTotals, transfermarktRows);

  const summary = {
    source: process.argv.includes('--offline')
      ? DEFAULT_FIXTURE
      : process.argv.find((a) => a.startsWith('--file=')) ?? TRANSFERMARKT_URL,
    comparedTeams: result.comparedTeams,
    ok: result.ok,
    mismatches: result.mismatches,
    teamsMissingFromTransfermarkt: result.teamsMissingFromTransfermarkt
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
