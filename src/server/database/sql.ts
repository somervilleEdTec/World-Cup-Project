/** Convert SQLite-style `?` placeholders to PostgreSQL `$1`, `$2`, … */
export function toPostgresParams(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}
