import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

function getScoreInputs(): HTMLInputElement[] {
  return [screen.getByLabelText('Home score'), screen.getByLabelText('Away score')];
}

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
    expect(screen.queryByLabelText('Home score')).toBeNull();
  });

  it('shows plain score text when group is user-locked before kickoff', () => {
    const groupMatch: Match = {
      id: 'g-a-1',
      stage: 'GROUP',
      group: 'A',
      kickoff: '2026-06-11T19:00:00Z',
      homeTeamId: 'mexico',
      awayTeamId: 'canada'
    };
    render(
      <FixturePickCard
        match={groupMatch}
        pick={{ matchId: 'g-a-1', homeScore: 2, awayScore: 1 }}
        nowIso="2026-06-01T00:00:00Z"
        groupUserLocked
        showLockedSummary={false}
        inputsDisabled={false}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText('2–1')).toBeTruthy();
    expect(screen.queryByLabelText('Home score')).toBeNull();
    expect(screen.queryByText(/Your prediction:/)).toBeNull();
  });

  it('shows locked summary when group is user-locked and official result exists', () => {
    const groupMatch: Match = {
      id: 'g-a-1',
      stage: 'GROUP',
      group: 'A',
      kickoff: '2026-06-11T19:00:00Z',
      homeTeamId: 'mexico',
      awayTeamId: 'canada'
    };
    render(
      <FixturePickCard
        match={groupMatch}
        pick={{ matchId: 'g-a-1', homeScore: 2, awayScore: 1 }}
        actual={{ matchId: 'g-a-1', homeScore: 1, awayScore: 0 }}
        nowIso="2026-06-28T20:00:00Z"
        groupUserLocked
        showLockedSummary={false}
        inputsDisabled
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText(/Your prediction:/)).toBeTruthy();
    expect(screen.getByText(/Official result:/)).toBeTruthy();
    expect(screen.getByText(/Points scored:/)).toBeTruthy();
    expect(screen.queryByLabelText('Home score')).toBeNull();
  });

  it('rejects decimal characters in score inputs', () => {
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
    const inputs = getScoreInputs();
    fireEvent.keyDown(inputs[0], { key: '.' });
    fireEvent.change(inputs[0], { target: { value: '2.5' } });
    expect((inputs[0] as HTMLInputElement).value).toBe('2');
  });

  it('keeps only the last typed digit and overwrites the previous value', () => {
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
    const inputs = getScoreInputs();
    expect(inputs[0].value).toBe('2');

    fireEvent.change(inputs[0], { target: { value: '23' } });
    expect(inputs[0].value).toBe('3');

    fireEvent.change(inputs[0], { target: { value: '37' } });
    expect(inputs[0].value).toBe('7');
  });

  it('overwrites a leading zero when typing a second digit', () => {
    const onScoresChange = vi.fn();
    render(
      <FixturePickCard
        match={koMatch}
        pick={{ matchId: 'r32-1', homeScore: 0, awayScore: 0 }}
        nowIso="2026-06-28T18:00:00Z"
        inputsDisabled={false}
        showLockedSummary={false}
        onSave={vi.fn()}
        onScoresChange={onScoresChange}
      />
    );
    const inputs = getScoreInputs();
    expect(inputs[0].value).toBe('0');

    fireEvent.change(inputs[0], { target: { value: '01' } });
    expect(onScoresChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ homeScore: 1, awayScore: 0 })
    );
    expect(inputs[0].value).toBe('1');

    fireEvent.change(inputs[0], { target: { value: '02' } });
    expect(inputs[0].value).toBe('2');

    fireEvent.change(inputs[0], { target: { value: '03' } });
    expect(inputs[0].value).toBe('3');
  });

  it('replaces a leading zero when typing a digit key', () => {
    render(
      <FixturePickCard
        match={koMatch}
        pick={{ matchId: 'r32-1', homeScore: 0, awayScore: 0 }}
        nowIso="2026-06-28T18:00:00Z"
        inputsDisabled={false}
        showLockedSummary={false}
        onSave={vi.fn()}
      />
    );
    const inputs = getScoreInputs();
    expect(inputs[0].value).toBe('0');

    fireEvent.keyDown(inputs[0], { key: '2' });
    expect(inputs[0].value).toBe('2');
  });

  it('shows editable score inputs before kickoff when not locked', () => {
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
    expect(screen.getByLabelText('Home score')).toBeTruthy();
    expect(screen.getByLabelText('Away score')).toBeTruthy();
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
    expect(screen.queryByLabelText('Home score')).toBeNull();
    expect(screen.getByText(/2–1/)).toBeTruthy();
  });

  it('clears score input on touch focus for coarse-pointer devices', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('pointer: coarse'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

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

    const inputs = getScoreInputs();
    expect(inputs[0].value).toBe('2');

    fireEvent.focus(inputs[0]);
    expect(inputs[0].value).toBe('');

    fireEvent.change(inputs[0], { target: { value: '3' } });
    expect(inputs[0].value).toBe('3');

    window.matchMedia = originalMatchMedia;
  });

  it('restores score when touch focus clears but user blurs without typing', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('pointer: coarse'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

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

    const inputs = getScoreInputs();
    fireEvent.focus(inputs[0]);
    expect(inputs[0].value).toBe('');
    fireEvent.blur(inputs[0]);
    expect(inputs[0].value).toBe('2');

    window.matchMedia = originalMatchMedia;
  });

  it('does not clear score input on focus for fine pointer without touch', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

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

    const inputs = getScoreInputs();
    fireEvent.focus(inputs[0]);
    expect(inputs[0].value).toBe('2');

    window.matchMedia = originalMatchMedia;
  });

  it('colors knockout score inputs by save status', () => {
    const { rerender } = render(
      <FixturePickCard
        match={koMatch}
        nowIso="2026-06-28T18:00:00Z"
        inputsDisabled={false}
        showLockedSummary={false}
        onSave={vi.fn()}
      />
    );

    let inputs = getScoreInputs();
    expect(inputs[0].className).toContain('score-input-unpicked');
    expect(inputs[1].className).toContain('score-input-unpicked');

    rerender(
      <FixturePickCard
        match={koMatch}
        pick={pick}
        nowIso="2026-06-28T18:00:00Z"
        inputsDisabled={false}
        showLockedSummary={false}
        onSave={vi.fn()}
      />
    );

    inputs = getScoreInputs();
    expect(inputs[0].className).toContain('score-input-saved');
    expect(inputs[1].className).toContain('score-input-saved');

    fireEvent.change(inputs[0], { target: { value: '3' } });
    expect(inputs[0].className).toContain('score-input-pending');
    expect(inputs[1].className).toContain('score-input-pending');
  });

  it('does not color group-stage score inputs', () => {
    const groupMatch: Match = {
      id: 'g-a-1',
      stage: 'GROUP',
      group: 'A',
      kickoff: '2026-06-11T19:00:00Z',
      homeTeamId: 'mexico',
      awayTeamId: 'canada'
    };

    render(
      <FixturePickCard
        match={groupMatch}
        pick={{ matchId: 'g-a-1', homeScore: 2, awayScore: 1 }}
        nowIso="2026-06-01T00:00:00Z"
        inputsDisabled={false}
        showLockedSummary={false}
        onSave={vi.fn()}
      />
    );

    const inputs = getScoreInputs();
    expect(inputs[0].className).not.toContain('score-input-saved');
    expect(inputs[0].className).not.toContain('score-input-pending');
    expect(inputs[0].className).not.toContain('score-input-unpicked');
  });
});
