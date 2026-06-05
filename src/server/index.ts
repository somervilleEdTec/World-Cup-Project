import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app';
import { initDatabase, closeDatabase } from './database';
import {
  getFootballDataToken,
  isDebugLocalMode,
  shouldSyncFootballData
} from '../lib/runtimeConfig';
import { bootstrapFootballData, warnIfNonLiveResultsPresent } from './footballDataStartup';
import { seedGroupMatchMappings } from './services/matchMapping';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runFootballBootstrapInBackground(apiToken: string): Promise<void> {
  try {
    await bootstrapFootballData(apiToken);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      'football-data.org bootstrap skipped:',
      error instanceof Error ? error.message : error
    );
  }
  await warnIfNonLiveResultsPresent();
}

async function main() {
  await initDatabase();
  await seedGroupMatchMappings();

  if (isDebugLocalMode()) {
    // eslint-disable-next-line no-console
    console.log(
      'DEBUG_LOCAL=1 — local Debug mode: no football-data.org sync. Use npm run seed:debug for random results.'
    );
  }

  const footballToken = getFootballDataToken();
  if (process.env.NODE_ENV === 'production' && !isDebugLocalMode() && !footballToken) {
    // eslint-disable-next-line no-console
    console.error(
      'FOOTBALL_DATA_TOKEN (or FOOTBALL_API_KEY) is required in production for live results from football-data.org.'
    );
    process.exit(1);
  }

  const app = createApp();

  const distPath = path.resolve(__dirname, '../../dist');
  app.use(
    express.static(distPath, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store');
        }
      }
    })
  );
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? '0.0.0.0';
  const server = app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`API server listening on http://${host}:${port}`);
  });

  if (shouldSyncFootballData() && footballToken) {
    void runFootballBootstrapInBackground(footballToken);
  } else if (!isDebugLocalMode()) {
    // eslint-disable-next-line no-console
    console.warn(
      'No live results sync — set FOOTBALL_DATA_TOKEN or FOOTBALL_API_KEY for production, or DEBUG_LOCAL=1 + seed:debug for local testing.'
    );
    void warnIfNonLiveResultsPresent();
  }

  const shutdown = async () => {
    server.close();
    await closeDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
