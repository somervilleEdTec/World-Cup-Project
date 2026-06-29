import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OverallPicksPanel } from '../components/stats/OverallPicksPanel';
import type { OverallPicksResponse } from '../types';

const sampleData: OverallPicksResponse = {
  meta: {
    groupPhaseLocked: true,
    message: "Everyone's tournament podium picks, ranked by league position."
  },
  entries: [
    {
      rank: 1,
      userId: 'u1',
      name: 'Alice',
      hidden: false,
      bonus: {
        winnerTeamId: 'brazil',
        runnerUpTeamId: 'france',
        thirdTeamId: 'argentina',
        fourthTeamId: 'england'
      }
    },
    {
      rank: 2,
      userId: 'u2',
      name: 'Bob',
      hidden: true
    }
  ]
};

describe('OverallPicksPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the compact matrix table by default', () => {
    render(
      <MemoryRouter>
        <OverallPicksPanel data={sampleData} />
      </MemoryRouter>
    );

    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(document.querySelector('.overall-picks-matrix-wrap')).toBeTruthy();
  });

  it('shows hidden picks in the matrix before lock', () => {
    render(
      <MemoryRouter>
        <OverallPicksPanel
          data={{
            ...sampleData,
            meta: {
              groupPhaseLocked: false,
              message: 'Hidden until lock'
            }
          }}
        />
      </MemoryRouter>
    );

    const hiddenCells = document.querySelectorAll('.overall-pick-hidden');
    expect(hiddenCells.length).toBeGreaterThan(0);
  });

  it('switches to cards and consensus layouts', () => {
    render(
      <MemoryRouter>
        <OverallPicksPanel data={sampleData} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Cards' }));
    expect(document.querySelector('.overall-podium-cards')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Consensus' }));
    expect(document.querySelector('.overall-consensus-grid')).toBeTruthy();
  });
});
