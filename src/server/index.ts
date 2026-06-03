import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app';
import { initDatabase, closeDatabase } from './database';
import { bootstrapFootballData, warnIfNonLiveResultsPresent } from './footballDataStartup';
import { seedGroupMatchMappings } from './services/matchMapping';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await initDatabase();
  await seedGroupMatchMappings();

  const footballToken = process.env.FOOTBALL_DATA_TOKEN;
  if (footballToken) {
    try {
      await bootstrapFootballData(footballToken);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('football-data.org bootstrap skipped:', error instanceof Error ? error.message : error);
    }
    await warnIfNonLiveResultsPresent();
  } else if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error(
      'FOOTBALL_DATA_TOKEN is required in production for live results from football-data.org.'
    );
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      'FOOTBALL_DATA_TOKEN not set — no live results. Use npm run jobs or set the token in .env.'
    );
    await warnIfNonLiveResultsPresent();
  }

  const app = createApp();

  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? '0.0.0.0';
  const server = app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`API server listening on http://${host}:${port}`);
  });

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
