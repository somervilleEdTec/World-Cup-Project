import { describe, it, expect } from 'vitest';
import {
  assertTournamentStartRankingCoverage,
  FIFA_RANKING_EDITION_DATE,
  FIFA_WORLD_RANK_TOURNAMENT_START_2026,
  fifaWorldRankTournamentStart2026
} from '../data/fifaWorldRankingTournamentStart2026';
import { teams } from '../data/tournament';

describe('fifaWorldRankingTournamentStart2026', () => {
  it('uses the 11 June 2026 edition date (tournament opening day)', () => {
    expect(FIFA_RANKING_EDITION_DATE).toBe('2026-06-11');
  });

  it('covers all 48 World Cup finalists with no live-fetch fallback', () => {
    expect(Object.keys(FIFA_WORLD_RANK_TOURNAMENT_START_2026)).toHaveLength(48);
    expect(() => assertTournamentStartRankingCoverage()).not.toThrow();
    teams.forEach((team) => {
      expect(fifaWorldRankTournamentStart2026(team.id)).toBeLessThan(999);
    });
  });

  it('pins known Group H ranks used in tiebreaker regression', () => {
    expect(fifaWorldRankTournamentStart2026('spain')).toBe(2);
    expect(fifaWorldRankTournamentStart2026('uruguay')).toBe(16);
    expect(fifaWorldRankTournamentStart2026('saudi-arabia')).toBe(61);
    expect(fifaWorldRankTournamentStart2026('cape-verde')).toBe(67);
  });

  it('pins top-of-table ranks from the published opening-day list', () => {
    expect(fifaWorldRankTournamentStart2026('argentina')).toBe(1);
    expect(fifaWorldRankTournamentStart2026('france')).toBe(3);
    expect(fifaWorldRankTournamentStart2026('new-zealand')).toBe(85);
  });
});
