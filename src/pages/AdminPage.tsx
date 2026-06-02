import { FormEvent, useState } from 'react';
import { fetchSyncStatus, manualOverride, recomputeLeaderboard, runFixtureSync, runSync } from '../services/apiClient';

export function AdminPage() {
  const [message, setMessage] = useState<string>('');
  const [status, setStatus] = useState<{ last_success_at?: string | null; last_error?: string | null; last_attempt_at?: string | null } | null>(null);

  const loadStatus = async () => {
    try {
      const response = (await fetchSyncStatus()) as { last_success_at?: string | null; last_error?: string | null; last_attempt_at?: string | null };
      setStatus(response);
      setMessage('Sync status loaded.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load sync status');
    }
  };

  const triggerSync = async () => {
    try {
      const response = (await runSync()) as {
        kickoffs: { mapped: number; skipped: number };
        results: { updated: number; ok: boolean };
      };
      setMessage(
        `Full sync: ${response.kickoffs.mapped} kickoffs, ${response.results.updated} results updated.`
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

  return (
    <section className="stack">
      <article className="card">
        <h2>Admin</h2>
        <p>Sync monitoring, manual result override, and leaderboard recompute.</p>
        <div className="button-row">
          <button type="button" onClick={loadStatus}>Load Sync Status</button>
          <button type="button" onClick={triggerSync}>Run full football-data sync</button>
          <button type="button" onClick={triggerFixtureSync}>Import kickoffs only</button>
          <button type="button" onClick={recompute}>Recompute leaderboard</button>
        </div>
        {status && (
          <ul>
            <li>Last attempt: {status.last_attempt_at ?? 'n/a'}</li>
            <li>Last success: {status.last_success_at ?? 'n/a'}</li>
            <li>Last error: {status.last_error ?? 'none'}</li>
          </ul>
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
