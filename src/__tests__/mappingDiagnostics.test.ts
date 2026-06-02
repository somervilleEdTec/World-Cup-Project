import { describe, expect, it } from 'vitest';
import { classifyFixtureLocally } from '../server/services/mappingDiagnostics';
import { explainMappingFailure } from '../server/services/matchMapping';

describe('mapping diagnostics', () => {
  it('flags missing knockout teams', () => {
    expect(explainMappingFailure(null, 'Mexico', null)).toBe('missing_home_team');
    expect(explainMappingFailure('Mexico', null, null)).toBe('missing_away_team');
  });

  it('maps known group fixture teams', () => {
    expect(
      classifyFixtureLocally('Mexico', 'South Africa', null)
    ).toBe('mappable');
  });

  it('reports unmapped provider names', () => {
    expect(classifyFixtureLocally('Unknownland', 'Mexico', null)).toBe('unmapped_home_team');
  });
});
