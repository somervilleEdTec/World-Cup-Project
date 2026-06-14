/** Tables whose rows must never be destroyed by automated deploy/migrate paths. */
export const PROTECTED_TABLES = ['predictions', 'prediction_meta', 'users', 'results'] as const;

export interface MigrationRiskAnalysis {
  destructive: boolean;
  reasons: string[];
}

export interface ProtectedRowCounts {
  predictions: number;
  predictionMeta: number;
  users: number;
  results: number;
}

export interface DatabaseCountReader {
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
}

const DESTRUCTIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\bDROP\s+TABLE\b/i,
    reason: 'DROP TABLE would remove stored data'
  },
  {
    pattern: /\bDELETE\s+FROM\s+(predictions|prediction_meta|users|results)\b/i,
    reason: 'DELETE FROM a protected table would remove stored data'
  },
  {
    pattern: /\bTRUNCATE\b/i,
    reason: 'TRUNCATE would remove stored data'
  },
  {
    pattern:
      /\bALTER\s+TABLE\s+(predictions|prediction_meta|users|results)\b[^;]*\bDROP\s+COLUMN\b/i,
    reason: 'DROP COLUMN on a protected table may make predictions unusable'
  }
];

export function analyzeMigrationSql(sql: string): MigrationRiskAnalysis {
  const reasons: string[] = [];
  for (const { pattern, reason } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(sql)) {
      reasons.push(reason);
    }
  }
  return { destructive: reasons.length > 0, reasons };
}

export async function readProtectedRowCounts(db: DatabaseCountReader): Promise<ProtectedRowCounts> {
  const [predictions, predictionMeta, users, results] = await Promise.all([
    countTable(db, 'predictions'),
    countTable(db, 'prediction_meta'),
    countTable(db, 'users'),
    countTable(db, 'results')
  ]);
  return { predictions, predictionMeta, users, results };
}

async function countTable(db: DatabaseCountReader, table: string): Promise<number> {
  try {
    const row = await db.get<{ count: number | string }>(`SELECT COUNT(*) AS count FROM ${table}`);
    return Number(row?.count ?? 0);
  } catch {
    return 0;
  }
}

export function hasStoredPredictions(counts: ProtectedRowCounts): boolean {
  return counts.predictions > 0;
}

export function hasProtectedData(counts: ProtectedRowCounts): boolean {
  return (
    counts.predictions > 0 || counts.predictionMeta > 0 || counts.users > 0 || counts.results > 0
  );
}

export interface BlockedActionOptions {
  action: string;
  reasons: string[];
  alternatives: string[];
}

export function formatBlockedActionMessage(options: BlockedActionOptions): string {
  const lines = [
    '',
    '╔══════════════════════════════════════════════════════════════════════╗',
    '║  DATA PROTECTION — ACTION BLOCKED                                    ║',
    '╚══════════════════════════════════════════════════════════════════════╝',
    '',
    `Blocked action: ${options.action}`,
    '',
    'Reason:',
    ...options.reasons.map((reason) => `  • ${reason}`),
    '',
    'Your stored predictions and related data were not modified.',
    '',
    'Alternative solutions:',
    ...options.alternatives.map((alt, index) => `  ${index + 1}. ${alt}`),
    ''
  ];
  return lines.join('\n');
}

export function migrationBlockedAlternatives(): string[] {
  return [
    'Review the migration SQL and confirm it is additive-only (ADD COLUMN, CREATE TABLE IF NOT EXISTS).',
    'Take a manual retrieval archive: npm run db:archive — then restore from prediction-archive-retrieval-only/ if needed.',
    'If a destructive change is truly required, export predictions offline, apply the change manually, and re-import — never via automated deploy.',
    'For emergency override by a server operator only: DATA_PROTECTION_OVERRIDE=yes npm run migrate (documents intent; still creates no automatic backup).'
  ];
}

export function purgeBlockedAlternatives(): string[] {
  return [
    'Do nothing — keep the live database and deploy code-only updates instead.',
    'Export a retrieval archive first: npm run db:archive — copies are kept in prediction-archive-retrieval-only/ and are never used by the app.',
    'Use operational backups/backups/ to restore a specific point in time without wiping all users.',
    'If a full empty start is mandatory before any real predictions exist, use the documented wipe workflow once only — see docs/LAUNCH_RULES.md.'
  ];
}

export function resetBlockedAlternatives(): string[] {
  return [
    'Deploy code-only changes — normal pushes to main never reset the database.',
    'Create a retrieval archive: npm run db:archive',
    'Restore from prediction-archive-retrieval-only/ or backups/ instead of resetting.',
    'Use Debug branch locally with npm run db:purge for development resets only.'
  ];
}

export function assertDataProtectionOverrideAllowed(action: string): void {
  if (process.env.DATA_PROTECTION_OVERRIDE === 'yes') {
    // eslint-disable-next-line no-console
    console.warn(
      `WARNING: DATA_PROTECTION_OVERRIDE=yes — ${action} is proceeding despite data-protection rules.`
    );
    return;
  }
}
