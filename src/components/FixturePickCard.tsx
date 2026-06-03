import { useCallback, useEffect, useRef, useState, type WheelEvent } from 'react';
import { teams } from '../data/tournament';
import { computeMatchPoints } from '../lib/matchScoring';
import { isKnockout, kickoffReached } from '../lib/tournamentLogic';
import { ActualResult, Match, Pick } from '../types';
import { TeamLabel } from './TeamLabel';
import { formatFixtureScore } from './FixtureScoreSummary';

const AUTOSAVE_MS = 450;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function parseScoreInput(raw: string): number {
  if (raw.trim() === '') return 0;
  return clampScore(Number(raw));
}

function formatPickLine(pick: Pick | undefined, match: Match): string {
  if (!pick) return '—';
  const showAdvance = isKnockout(match);
  return formatFixtureScore(pick.homeScore, pick.awayScore, showAdvance ? pick.progressingTeamId : undefined);
}

function formatActualLine(actual: ActualResult, match: Match): string {
  const showAdvance = isKnockout(match);
  return formatFixtureScore(
    actual.homeScore,
    actual.awayScore,
    showAdvance ? actual.progressingTeamId : undefined
  );
}

function EditableScoreInputs({
  match,
  pick,
  disabled,
  onSave,
  onScoresChange
}: {
  match: Match;
  pick?: Pick;
  disabled: boolean;
  onSave: (pick: Pick) => Promise<void>;
  onScoresChange?: (pick: Pick) => void;
}) {
  const hasSavedPick = pick !== undefined;
  const [homeScore, setHomeScore] = useState(pick?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(pick?.awayScore ?? 0);
  const [progressingTeamId, setProgressingTeamId] = useState(pick?.progressingTeamId ?? '');
  const [edited, setEdited] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editedRef = useRef(edited);
  const disabledRef = useRef(disabled);
  editedRef.current = edited;
  disabledRef.current = disabled;

  useEffect(() => {
    setHomeScore(pick?.homeScore ?? 0);
    setAwayScore(pick?.awayScore ?? 0);
    setProgressingTeamId(pick?.progressingTeamId ?? '');
    setEdited(false);
  }, [pick?.homeScore, pick?.awayScore, pick?.progressingTeamId, match.id]);

  const buildPick = useCallback((): Pick => {
    const home = clampScore(homeScore);
    const away = clampScore(awayScore);
    return {
      matchId: match.id,
      homeScore: home,
      awayScore: away,
      progressingTeamId: home === away ? progressingTeamId || undefined : undefined
    };
  }, [awayScore, homeScore, match.id, progressingTeamId]);

  const buildPickRef = useRef(buildPick);
  const onSaveRef = useRef(onSave);
  buildPickRef.current = buildPick;
  onSaveRef.current = onSave;

  const notifyChange = useCallback(
    (nextHome: number, nextAway: number, nextProgressing = progressingTeamId) => {
      if (!onScoresChange) return;
      const home = clampScore(nextHome);
      const away = clampScore(nextAway);
      onScoresChange({
        matchId: match.id,
        homeScore: home,
        awayScore: away,
        progressingTeamId: home === away ? nextProgressing || undefined : undefined
      });
    },
    [match.id, onScoresChange, progressingTeamId]
  );

  const scheduleSave = useCallback(() => {
    if (disabled || !edited) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void onSave(buildPick());
    }, AUTOSAVE_MS);
  }, [buildPick, disabled, edited, onSave]);

  useEffect(() => {
    scheduleSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [homeScore, awayScore, progressingTeamId, scheduleSave]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (editedRef.current && !disabledRef.current) {
        void onSaveRef.current(buildPickRef.current());
      }
    };
  }, [match.id]);

  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  const isDraw = clampScore(homeScore) === clampScore(awayScore);

  const handleScoreWheel = (event: WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
  };

  return (
    <>
      <div className="score-inputs">
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={hasSavedPick || edited ? homeScore : ''}
          placeholder="0"
          disabled={disabled}
          onWheel={handleScoreWheel}
          onChange={(event) => {
            const next = parseScoreInput(event.target.value);
            setEdited(true);
            setHomeScore(next);
            notifyChange(next, awayScore);
          }}
        />
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={hasSavedPick || edited ? awayScore : ''}
          placeholder="0"
          disabled={disabled}
          onWheel={handleScoreWheel}
          onChange={(event) => {
            const next = parseScoreInput(event.target.value);
            setEdited(true);
            setAwayScore(next);
            notifyChange(homeScore, next);
          }}
        />
      </div>
      {isDraw && isKnockout(match) && (
        <label>
          Draw selected — choose the team that progresses.
          <select
            value={progressingTeamId}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value;
              setEdited(true);
              setProgressingTeamId(next);
              notifyChange(homeScore, awayScore, next);
            }}
          >
            <option value="">Select progressing team</option>
            {homeTeam && <option value={homeTeam.id}>{homeTeam.name}</option>}
            {awayTeam && <option value={awayTeam.id}>{awayTeam.name}</option>}
          </select>
        </label>
      )}
    </>
  );
}

export interface FixturePickCardProps {
  match: Match;
  pick?: Pick;
  actual?: ActualResult;
  nowIso: string;
  /** Disables score inputs (e.g. 72 group picks not complete) without switching to locked summary. */
  inputsDisabled: boolean;
  /** When true, show prediction as text with official result and points (group-style locked view). */
  showLockedSummary: boolean;
  onSave: (pick: Pick) => Promise<void>;
  onScoresChange?: (pick: Pick) => void;
  kickoffHint?: string;
}

export function FixturePickCard({
  match,
  pick,
  actual,
  nowIso,
  inputsDisabled,
  showLockedSummary,
  onSave,
  onScoresChange,
  kickoffHint
}: FixturePickCardProps) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  const homeOk = homeTeam && homeTeam.id !== 'tbd';
  const awayOk = awayTeam && awayTeam.id !== 'tbd';
  const kickoffLocked = kickoffReached(match.kickoff, nowIso);
  const inputsSaveDisabled = inputsDisabled || kickoffLocked;
  const points = computeMatchPoints(pick, actual, match.stage);

  return (
    <div className="fixture-card">
      {match.stage !== 'GROUP' && <p className="kicker">{match.stage}</p>}
      <div className="fixture-row">
        {homeOk ? <TeamLabel team={homeTeam!} /> : <span>TBD</span>} <strong>vs</strong>{' '}
        {awayOk ? <TeamLabel team={awayTeam!} /> : <span>TBD</span>}
      </div>
      {kickoffHint && <p className="fixture-meta">{kickoffHint}</p>}

      {showLockedSummary ? (
        <div className="fixture-scores-summary fixture-scores-locked">
          <p>
            <strong>Your prediction:</strong> {formatPickLine(pick, match)}
          </p>
          {actual && (
            <p className="fixture-actual">
              <strong>Official result:</strong> {formatActualLine(actual, match)}
            </p>
          )}
          {actual && (
            <p className="fixture-points">
              <strong>Points scored:</strong> {points ?? 0}
            </p>
          )}
        </div>
      ) : (
        <>
          {actual && (
            <p className="fixture-actual fixture-actual-preview">
              <strong>Official result:</strong> {formatActualLine(actual, match)}
            </p>
          )}
          <EditableScoreInputs
            match={match}
            pick={pick}
            disabled={inputsSaveDisabled}
            onSave={onSave}
            onScoresChange={onScoresChange}
          />
        </>
      )}
    </div>
  );
}
