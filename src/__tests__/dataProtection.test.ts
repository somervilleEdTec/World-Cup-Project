import { describe, expect, it } from 'vitest';
import {
  analyzeMigrationSql,
  formatBlockedActionMessage,
  hasStoredPredictions
} from '../lib/dataProtection';

describe('dataProtection', () => {
  it('flags destructive migration SQL', () => {
    const analysis = analyzeMigrationSql('DROP TABLE predictions;');
    expect(analysis.destructive).toBe(true);
    expect(analysis.reasons.length).toBeGreaterThan(0);
  });

  it('allows additive migration SQL', () => {
    const analysis = analyzeMigrationSql(
      "ALTER TABLE prediction_meta ADD COLUMN accepted_groups TEXT NOT NULL DEFAULT '[]';"
    );
    expect(analysis.destructive).toBe(false);
  });

  it('detects stored predictions from counts', () => {
    expect(hasStoredPredictions({ predictions: 1, predictionMeta: 0, users: 0, results: 0 })).toBe(
      true
    );
    expect(hasStoredPredictions({ predictions: 0, predictionMeta: 0, users: 0, results: 0 })).toBe(
      false
    );
  });

  it('formats blocked action messages with alternatives', () => {
    const message = formatBlockedActionMessage({
      action: 'Test action',
      reasons: ['Example reason'],
      alternatives: ['First option', 'Second option']
    });
    expect(message).toMatch(/DATA PROTECTION — ACTION BLOCKED/);
    expect(message).toMatch(/First option/);
    expect(message).toMatch(/not modified/);
  });
});
