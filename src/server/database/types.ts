export interface DatabaseClient {
  dialect: 'sqlite' | 'postgres';
  exec(sql: string): Promise<void>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
  transaction<T>(fn: (tx: DatabaseClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
