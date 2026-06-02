import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app';
import { initDatabase, closeDatabase } from './database';
import { seedGroupMatchMappings } from './services/matchMapping';
import { syncKickoffsFromFootballData } from './services/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await initDatabase();
  await seedGroupMatchMappings();

  const footballToken = process.env.FOOTBALL_DATA_TOKEN;
  if (footballToken) {
    try {
      const kickoffs = await syncKickoffsFromFootballData(footballToken);
      // eslint-disable-next-line no-console
      console.log(`Kickoffs loaded from football-data.org: ${kickoffs.mapped}/${kickoffs.total}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Kickoff import skipped:', error instanceof Error ? error.message : error);
    }
  }

  const app = createApp();

  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const port = Number(process.env.PORT ?? 8787);
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API server listening on :${port}`);
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
