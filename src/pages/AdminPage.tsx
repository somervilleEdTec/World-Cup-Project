import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { teams } from '../data/tournament';
import { formatOptionalKickoffBst } from '../lib/formatDateTime';
import { formatFixtureOptionLabel } from '../lib/fixtureLabels';
import {
  createPlayer,
  deletePlayer,
  fetchAdminFixtures,
  fetchMappingDiagnostics,
  fetchSyncStatus,
  listPlayers,
  manualOverride,
  recomputeLeaderboard,
  runFixtureSync,
  runPredictionLocks,
  runSync
} from '../services/apiClient';

interface DiagnosticsReport {
  summary: {
    mapped: number;
    skipped: number;
    groupStageMapped: number;
    groupStageTotal: number;
    knockoutMapped: number;
    knockoutTotal: number;
  };
  skipReasons: Record<string, number>;
  unmappedTeamNames: Array<{ name: string; count: number }>;
  totals: {
    kickoffsInDatabase: number;
    providerMappingsInDatabase: number;
    providerFixtures: number;
  };
  samples: Array<{
    providerId: string;
    homeName: string | null;
    awayName: string | null;
    status: string;
    kickoff: string;
    reason: string;
  }>;
  notes: string[];
}

interface AdminFixture {
  id: string;
  stage: string;
  group?: string;
  kickoff: string;
  homeTeamId: string;
  awayTeamId: string;
  hasResult: boolean;
}

function StatusBanner({ tone, message }: { tone: 'ok' | 'error'; message: string }) {
  return (
    <p className={tone === 'error' ? 'admin-banner admin-banner-error' : 'admin-banner'}>
      {message}
    </p>
  );
}

export function AdminPage() {
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const [players, setPlayers] = useState<
    Array<{ id: string; displayName: string; mustChangePassword: boolean; createdAt: string }>
  >([]);
  const [fixtures, setFixtures] = useState<AdminFixture[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState('');
  const [status, setStatus] = useState<{
    last_success_at?: string | null;
    last_error?: string | null;
    last_attempt_at?: string | null;
  } | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);

  const clearMessages = () => {
    setStatusMessage('');
    setErrorMessage('');
  };

  const runAction = async (label: string, action: () => Promise<void>) => {
    clearMessages();
    setBusy(label);
    try {
      await action();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : `${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  const loadPlayers = useCallback(async () => {
    const response = await listPlayers();
    setPlayers(response.players);
  }, []);

  const loadFixtures = useCallback(async () => {
    const response = await fetchAdminFixtures();
    setFixtures(response.fixtures);
    setSelectedFixtureId((current) => current || response.fixtures[0]?.id || '');
  }, []);

  const loadStatus = useCallback(async () => {
    const response = (await fetchSyncStatus()) as {
      last_success_at?: string | null;
      last_error?: string | null;
      last_attempt_at?: string | null;
    };
    setStatus(response);
  }, []);

  const loadDiagnostics = useCallback(async () => {
    const report = (await fetchMappingDiagnostics()) as DiagnosticsReport;
    setDiagnostics(report);
  }, []);

  useEffect(() => {
    void Promise.all([loadPlayers(), loadFixtures(), loadStatus()]).catch((err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load admin data');
    });
  }, [loadFixtures, loadPlayers, loadStatus]);

  const selectedFixture = useMemo(
    () => fixtures.find((fixture) => fixture.id === selectedFixtureId) ?? null,
    [fixtures, selectedFixtureId]
  );

  const fixtureTeams = useMemo(() => {
    if (!selectedFixture) return [];
    return [selectedFixture.homeTeamId, selectedFixture.awayTeamId]
      .map((teamId) => teams.find((team) => team.id === teamId))
      .filter((team): team is (typeof teams)[number] => Boolean(team && team.id !== 'tbd'));
  }, [selectedFixture]);

  const addPlayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await runAction('add-player', async () => {
      const displayName = String(data.get('displayName'));
      const initialPassword = String(data.get('initialPassword'));
      await createPlayer(displayName, initialPassword);
      setStatusMessage(
        `Player ${displayName} created. Share their temporary password privately — they must change it on first login.`
      );
      event.currentTarget.reset();
      await loadPlayers();
    });
  };

  const removePlayer = async (player: { id: string; displayName: string }) => {
    const confirmed = window.confirm(
      `Remove ${player.displayName}? This deletes their predictions and cannot be undone.`
    );
    if (!confirmed) return;

    await runAction('remove-player', async () => {
      await deletePlayer(player.id);
      setStatusMessage(`Removed player ${player.displayName}.`);
      await loadPlayers();
    });
  };

  const triggerSync = async () => {
    const confirmed = window.confirm(
      'Run a full football-data sync now? This updates kickoffs and finished results from the API.'
    );
    if (!confirmed) return;

    await runAction('full-sync', async () => {
      const response = (await runSync()) as {
        kickoffs: { mapped: number; skipped: number };
        results: { updated: number; ok: boolean };
      };
      setStatusMessage(
        `Full sync complete: ${response.kickoffs.mapped} kickoffs mapped (${response.kickoffs.skipped} skipped), ${response.results.updated} results updated.`
      );
      await Promise.all([loadStatus(), loadFixtures(), loadDiagnostics().catch(() => undefined)]);
    });
  };

  const triggerFixtureSync = async () => {
    await runAction('fixture-sync', async () => {
      const response = (await runFixtureSync()) as { mapped: number; skipped: number };
      setStatusMessage(
        `Kickoff import complete: ${response.mapped} fixtures mapped (${response.skipped} skipped).`
      );
      await loadFixtures();
    });
  };

  const refreshDiagnostics = async () => {
    await runAction('diagnostics', async () => {
      await loadDiagnostics();
      setStatusMessage('Mapping diagnostics refreshed.');
    });
  };

  const triggerLocks = async () => {
    await runAction('locks', async () => {
      await runPredictionLocks();
      setStatusMessage('Prediction lock pass completed.');
    });
  };

  const recompute = async () => {
    await runAction('recompute', async () => {
      await recomputeLeaderboard();
      setStatusMessage('Leaderboard recomputed.');
    });
  };

  const override = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const matchId = String(data.get('matchId') || selectedFixtureId);
    const homeScore = Number(data.get('homeScore'));
    const awayScore = Number(data.get('awayScore'));
    const progressingTeamId = String(data.get('progressingTeamId') || '') || undefined;

    const confirmed = window.confirm(
      `Save manual result for ${matchId}: ${homeScore}-${awayScore}${progressingTeamId ? ` (advancer: ${progressingTeamId})` : ''}?`
    );
    if (!confirmed) return;

    await runAction('override', async () => {
      await manualOverride({
        matchId,
        homeScore,
        awayScore,
        progressingTeamId,
        status: 'FINISHED'
      });
      setStatusMessage(`Manual result saved for ${matchId}.`);
      await loadFixtures();
    });
  };

  const activePlayers = players.filter((player) => !player.mustChangePassword).length;
  const pendingPlayers = players.length - activePlayers;
  const finishedFixtures = fixtures.filter((fixture) => fixture.hasResult).length;

  return (
    <section className="stack">
      <article className="card">
        <h2>League admin</h2>
        <p>
          Manage players, monitor football-data sync, override results, and run maintenance tasks.
          The organiser account is excluded from the leaderboard.
        </p>
        <div className="admin-quick-links">
          <Link to="/leaderboard">View leaderboard</Link>
          <Link to="/comparison">Open stats</Link>
        </div>
        <ul className="admin-summary">
          <li>
            {players.length} players ({activePlayers} active, {pendingPlayers} awaiting first login)
          </li>
          <li>
            {finishedFixtures}/{fixtures.length} fixtures with results
          </li>
          {status && (
            <li>
              Last sync: {formatOptionalKickoffBst(status.last_success_at) ?? 'never'}
              {status.last_error ? ` — last error: ${status.last_error}` : ''}
            </li>
          )}
        </ul>
        {statusMessage && <StatusBanner tone="ok" message={statusMessage} />}
        {errorMessage && <StatusBanner tone="error" message={errorMessage} />}
      </article>

      <article className="card">
        <h2>Players</h2>
        <p>
          Add league members with a temporary password. They choose their own password on first
          login.
        </p>
        <form onSubmit={addPlayer} className="form-grid">
          <label>
            Username
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={40}
              placeholder="Player name"
              disabled={busy === 'add-player'}
            />
          </label>
          <label>
            Temporary password (up to 30 characters)
            <input
              name="initialPassword"
              required
              minLength={1}
              maxLength={30}
              type="text"
              autoComplete="off"
              disabled={busy === 'add-player'}
            />
          </label>
          <button type="submit" disabled={busy === 'add-player'}>
            {busy === 'add-player' ? 'Adding…' : 'Add player'}
          </button>
        </form>
        {players.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Status</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td>{player.displayName}</td>
                  <td>{player.mustChangePassword ? 'Awaiting first login' : 'Active'}</td>
                  <td>{formatOptionalKickoffBst(player.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-button-danger"
                      disabled={busy === 'remove-player'}
                      onClick={() => void removePlayer(player)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No players yet.</p>
        )}
      </article>

      <article className="card">
        <h2>Sync &amp; diagnostics</h2>
        <p>
          football-data.org updates kickoffs every 6 hours and results every 2 minutes when the jobs
          process is running. Use these tools if something looks stale.
        </p>
        <div className="button-row">
          <button
            type="button"
            onClick={() => void runAction('refresh-status', loadStatus)}
            disabled={Boolean(busy)}
          >
            Refresh sync status
          </button>
          <button type="button" onClick={() => void refreshDiagnostics()} disabled={Boolean(busy)}>
            Refresh mapping diagnostics
          </button>
          <button type="button" onClick={() => void triggerFixtureSync()} disabled={Boolean(busy)}>
            Import kickoffs only
          </button>
          <button type="button" onClick={() => void triggerSync()} disabled={Boolean(busy)}>
            Run full football-data sync
          </button>
        </div>
        {status && (
          <ul>
            <li>Last attempt: {formatOptionalKickoffBst(status.last_attempt_at)}</li>
            <li>Last success: {formatOptionalKickoffBst(status.last_success_at)}</li>
            <li>Last error: {status.last_error ?? 'none'}</li>
          </ul>
        )}
        {diagnostics && (
          <div className="admin-diagnostics">
            <h3>Mapping diagnostics</h3>
            <ul>
              <li>
                Group stage mapped: {diagnostics.summary.groupStageMapped}/
                {diagnostics.summary.groupStageTotal}
              </li>
              <li>
                Knockout mapped: {diagnostics.summary.knockoutMapped}/
                {diagnostics.summary.knockoutTotal}
              </li>
              <li>
                Overall: {diagnostics.summary.mapped} mapped, {diagnostics.summary.skipped} skipped
              </li>
              <li>Provider fixtures: {diagnostics.totals.providerFixtures}</li>
              <li>Kickoffs in DB: {diagnostics.totals.kickoffsInDatabase}</li>
              <li>Provider mappings in DB: {diagnostics.totals.providerMappingsInDatabase}</li>
            </ul>
            {Object.keys(diagnostics.skipReasons).length > 0 && (
              <>
                <h4>Skip reasons</h4>
                <ul>
                  {Object.entries(diagnostics.skipReasons).map(([reason, count]) => (
                    <li key={reason}>
                      {reason}: {count}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {diagnostics.unmappedTeamNames.length > 0 && (
              <>
                <h4>Unmapped team names</h4>
                <ul>
                  {diagnostics.unmappedTeamNames.map((row) => (
                    <li key={row.name}>
                      {row.name} ({row.count})
                    </li>
                  ))}
                </ul>
              </>
            )}
            {diagnostics.samples.length > 0 && (
              <>
                <h4>Unmapped fixture samples</h4>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Provider ID</th>
                        <th>Fixture</th>
                        <th>Kickoff</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostics.samples.slice(0, 10).map((sample) => (
                        <tr key={sample.providerId}>
                          <td>{sample.providerId}</td>
                          <td>
                            {sample.homeName ?? 'TBD'} vs {sample.awayName ?? 'TBD'}
                          </td>
                          <td>{formatOptionalKickoffBst(sample.kickoff)}</td>
                          <td>{sample.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {diagnostics.notes.length > 0 && (
              <ul>
                {diagnostics.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </article>

      <article className="card">
        <h2>Manual result override</h2>
        <p>
          Use when football-data is wrong or delayed. Scores are 90-minute results. For knockout
          draws, choose who advances after extra time or penalties.
        </p>
        <form onSubmit={override} className="form-grid">
          <label>
            Fixture
            <select
              value={selectedFixtureId}
              onChange={(event) => setSelectedFixtureId(event.target.value)}
              disabled={fixtures.length === 0 || Boolean(busy)}
            >
              {fixtures.map((fixture) => (
                <option key={fixture.id} value={fixture.id}>
                  {formatFixtureOptionLabel(fixture, teams, { includeId: true })}
                  {fixture.hasResult ? ' · has result' : ''}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="matchId" value={selectedFixtureId} />
          <label>
            Home score
            <input name="homeScore" type="number" min="0" required defaultValue={0} />
          </label>
          <label>
            Away score
            <input name="awayScore" type="number" min="0" required defaultValue={0} />
          </label>
          <label>
            Advancing team (knockout draws only)
            <select name="progressingTeamId" defaultValue="">
              <option value="">Not needed / draw without advancer</option>
              {fixtureTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={!selectedFixtureId || Boolean(busy)}>
            {busy === 'override' ? 'Saving…' : 'Save override'}
          </button>
        </form>
      </article>

      <article className="card">
        <h2>Maintenance</h2>
        <p>
          Run the prediction lock pass manually after kickoff if needed, then recompute the
          leaderboard if points look stale.
        </p>
        <div className="button-row">
          <button type="button" onClick={() => void triggerLocks()} disabled={Boolean(busy)}>
            Run prediction locks
          </button>
          <button type="button" onClick={() => void recompute()} disabled={Boolean(busy)}>
            Recompute leaderboard
          </button>
        </div>
      </article>
    </section>
  );
}
