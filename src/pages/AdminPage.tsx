import { FormEvent, useEffect, useState } from 'react';
import { formatOptionalKickoffBst } from '../lib/formatDateTime';
import {
  createPlayer,
  fetchMappingDiagnostics,
  fetchSyncStatus,
  listPlayers,
  manualOverride,
  recomputeLeaderboard,
  runFixtureSync,
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
  };
  notes: string[];
}

export function AdminPage() {
  const [message, setMessage] = useState<string>('');
  const [players, setPlayers] = useState<
    Array<{ id: string; displayName: string; mustChangePassword: boolean; createdAt: string }>
  >([]);
  const [status, setStatus] = useState<{
    last_success_at?: string | null;
    last_error?: string | null;
    last_attempt_at?: string | null;
  } | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);

  const loadStatus = async () => {
    try {
      const response = (await fetchSyncStatus()) as {
        last_success_at?: string | null;
        last_error?: string | null;
        last_attempt_at?: string | null;
      };
      setStatus(response);
      setMessage('Sync status loaded.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load sync status');
    }
  };

  const loadDiagnostics = async () => {
    try {
      const report = (await fetchMappingDiagnostics()) as DiagnosticsReport;
      setDiagnostics(report);
      setMessage('Mapping diagnostics loaded.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Diagnostics failed');
    }
  };

  const triggerSync = async () => {
    try {
      const response = (await runSync()) as {
        kickoffs: { mapped: number; skipped: number; skipReasons?: Record<string, number> };
        results: { updated: number; ok: boolean };
      };
      setMessage(
        `Full sync: ${response.kickoffs.mapped} kickoffs (${response.kickoffs.skipped} skipped), ${response.results.updated} results updated.`
      );
      await loadStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sync failed');
    }
  };

  const triggerFixtureSync = async () => {
    try {
      const response = (await runFixtureSync()) as { mapped: number; skipped: number };
      setMessage(`Kickoffs updated: ${response.mapped} fixtures (${response.skipped} skipped).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Kickoff sync failed');
    }
  };

  const override = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await manualOverride({
        matchId: String(data.get('matchId')),
        homeScore: Number(data.get('homeScore')),
        awayScore: Number(data.get('awayScore')),
        progressingTeamId: String(data.get('progressingTeamId') || '') || undefined,
        status: 'FINISHED'
      });
      setMessage('Manual override saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Override failed');
    }
  };

  const recompute = async () => {
    try {
      await recomputeLeaderboard();
      setMessage('Leaderboard recomputed.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Recompute failed');
    }
  };

  const loadPlayers = async () => {
    try {
      const response = await listPlayers();
      setPlayers(response.players);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load players');
    }
  };

  useEffect(() => {
    void loadPlayers();
  }, []);

  const addPlayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const displayName = String(data.get('displayName'));
      const initialPassword = String(data.get('initialPassword'));
      await createPlayer(displayName, initialPassword);
      setMessage(`Player ${displayName} created. They must change password on first login.`);
      event.currentTarget.reset();
      await loadPlayers();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not create player');
    }
  };

  return (
    <section className="stack">
      <article className="card">
        <h2>Players</h2>
        <p>Add league members here. Give them the username and temporary password below.</p>
        <form onSubmit={addPlayer} className="form-grid">
          <label>
            Username
            <input name="displayName" required minLength={2} maxLength={40} placeholder="Shiva XI" />
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
            />
          </label>
          <button type="submit">Add player</button>
        </form>
        {players.length > 0 && (
          <ul>
            {players.map((player) => (
              <li key={player.id}>
                {player.displayName}
                {player.mustChangePassword ? ' — awaiting first login' : ' — active'}
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="card">
        <h2>Operations</h2>
        <p>
          Sync monitoring, mapping diagnostics, manual result override, and leaderboard recompute.
        </p>
        <div className="button-row">
          <button type="button" onClick={loadStatus}>
            Load Sync Status
          </button>
          <button type="button" onClick={loadDiagnostics}>
            Mapping diagnostics
          </button>
          <button type="button" onClick={triggerSync}>
            Run full football-data sync
          </button>
          <button type="button" onClick={triggerFixtureSync}>
            Import kickoffs only
          </button>
          <button type="button" onClick={recompute}>
            Recompute leaderboard
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
          <div>
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
              <li>Kickoffs in DB: {diagnostics.totals.kickoffsInDatabase}</li>
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
                <h4>Unmapped team names (add aliases)</h4>
                <ul>
                  {diagnostics.unmappedTeamNames.map((row) => (
                    <li key={row.name}>
                      {row.name} ({row.count})
                    </li>
                  ))}
                </ul>
              </>
            )}
            <ul>
              {diagnostics.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
        <p>{message}</p>
      </article>

      <article className="card">
        <h3>Manual result override</h3>
        <form onSubmit={override} className="form-grid">
          <label>
            Match ID
            <input name="matchId" required placeholder="r32-1" />
          </label>
          <label>
            Home score
            <input name="homeScore" type="number" min="0" required />
          </label>
          <label>
            Away score
            <input name="awayScore" type="number" min="0" required />
          </label>
          <label>
            Progressing team id (if needed)
            <input name="progressingTeamId" placeholder="mexico" />
          </label>
          <button type="submit">Save override</button>
        </form>
      </article>
    </section>
  );
}
