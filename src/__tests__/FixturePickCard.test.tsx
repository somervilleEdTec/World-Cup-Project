import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FixturePickCard } from '../components/FixturePickCard';
import type { ActualResult, Match, Pick } from '../types';

const koMatch: Match = {
  id: 'r32-1',
  stage: 'R32',
  kickoff: '2026-06-28T19:00:00Z',
  homeTeamId: 'mexico',
  awayTeamId: 'canada'
};

const pick: Pick = { matchId: 'r32-1', homeScore: 2, awayScore: 1 };
const actual: ActualResult = { matchId: 'r32-1', homeScore: 1, awayScore: 0 };

describe('FixturePickCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows locked summary for knockout after kickoff', () => {
    render(
      <FixturePickCard
        match={koMatch}
        pick={pick}
        actual={actual}
        nowIso="2026-06-28T20:00:00Z"
        inputsDisabled={false}
        showLockedSummary
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText(/Your prediction:/)).toBeTruthy();
    expect(screen.getByText(/Official result:/)).toBeTruthy();
    expect(screen.getByText(/Points scored:/)).toBeTruthy();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('shows editable inputs before kickoff when not locked', () => {
    render(
      <FixturePickCard
        match={koMatch}
        pick={pick}
        nowIso="2026-06-28T18:00:00Z"
        inputsDisabled={false}
        showLockedSummary={false}
        onSave={vi.fn()}
      />
    );
    expect(screen.getAllByRole('spinbutton').length).toBe(2);
    expect(screen.queryByText(/Points scored:/)).toBeNull();
  });

  it('shows locked summary when showLockedSummary even if inputs gate is open', () => {
    render(
      <FixturePickCard
        match={koMatch}
        pick={pick}
        actual={actual}
        nowIso="2026-06-01T00:00:00Z"
        inputsDisabled={false}
        showLockedSummary
        onSave={vi.fn()}
      />
    );
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.getByText(/2–1/)).toBeTruthy();
  });
});
