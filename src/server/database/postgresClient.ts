import pg from 'pg';
import type { DatabaseClient } from './types';
import { toPostgresParams } from './sql';

const { Pool } = pg;

export function createPostgresClient(connectionString: string): DatabaseClient {
  const pool = new Pool({ connectionString });

  function clientFromPg(pgClient: pg.Pool | pg.PoolClient): DatabaseClient {
    const query = async (sql: string, params: unknown[] = []) => {
      const text = toPostgresParams(sql);
      return pgClient.query(text, params);
    };

    const client: DatabaseClient = {
      dialect: 'postgres',
      async exec(sql: string) {
        await query(sql);
      },
      async get<T>(sql: string, params: unknown[] = []) {
        const result = await query(sql, params);
        return result.rows[0] as T | undefined;
      },
      async all<T>(sql: string, params: unknown[] = []) {
        const result = await query(sql, params);
        return result.rows as T[];
      },
      async run(sql: string, params: unknown[] = []) {
        await query(sql, params);
      },
      async transaction<T>(fn: (tx: DatabaseClient) => Promise<T>) {
        const conn = await pool.connect();
        try {
          await conn.query('BEGIN');
          const txClient = clientFromPg(conn);
          const result = await fn(txClient);
          await conn.query('COMMIT');
          return result;
        } catch (error) {
          await conn.query('ROLLBACK');
          throw error;
        } finally {
          conn.release();
        }
      },
      async close() {
        await pool.end();
      }
    };
    return client;
  }

  return clientFromPg(pool);
}
