import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LeagueTablePage } from '../pages/LeagueTablePage';
import type { LeaderboardEntry } from '../types';

const sampleEntry: LeaderboardEntry = {
  rank: 1,
  userId: 'u1',
  name: 'Alice',
  points: 42,
  correctResultPoints: 10,
  exactScorePoints: 8,
  correctResults: 5,
  exactScores: 2,
  groupPositionPoints: 3,
  bonusPoints: 11
};

vi.mock('../services/apiClient', () => ({
  fetchLeaderboard: vi.fn(),
  userFacingError: (_err: unknown, fallback: string) => fallback
}));

import { fetchLeaderboard } from '../services/apiClient';

describe('LeagueTablePage', () => {
  beforeEach(() => {
    vi.mocked(fetchLeaderboard).mockResolvedValue({
      entries: [sampleEntry],
      meta: {
        tournamentFinalComplete: false,
        coinFlip: { applied: false }
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows Rank, Player, and Pts by default without breakdown columns', async () => {
    render(<LeagueTablePage />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
    });

    expect(screen.getByRole('columnheader', { name: 'Rank' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Player' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Pts' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'CR' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'ES' })).toBeNull();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('shows breakdown columns with counts and tournament points when toggled', async () => {
    render(<LeagueTablePage />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('Show breakdown'));

    expect(screen.getByRole('columnheader', { name: 'CR' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'ES' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'GP' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'TP' })).toBeTruthy();

    const row = screen.getByText('Alice').closest('tr');
    expect(row?.textContent).toContain('5');
    expect(row?.textContent).toContain('2');
    expect(row?.textContent).toContain('3');
    expect(row?.textContent).toContain('11');
    expect(row?.textContent).not.toContain('10');
    expect(row?.textContent).not.toContain('8');
  });

  it('shows legend note and scoring info panel from info button', async () => {
    render(<LeagueTablePage />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
    });

    expect(
      screen.getByText(/CR and ES show how many matches you got right, not the points earned/)
    ).toBeTruthy();
    expect(screen.getByText('Correct Results')).toBeTruthy();
    expect(screen.getByText('Tournament Points')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'How points are calculated' }));

    expect(screen.getByText(/Correct win\/draw\/loss: \+2 points/)).toBeTruthy();
    expect(screen.getByText(/Champion: \+6/)).toBeTruthy();
  });
});
