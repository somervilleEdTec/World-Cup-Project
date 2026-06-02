import { Link } from 'react-router-dom';
import { useAppStore } from '../lib/store';

export function WelcomePage() {
  const affectedMatches = useAppStore((state) => state.affectedMatches.length);
  const groupLocked = useAppStore((state) => state.commitState.groupLocked);

  return (
    <section className="stack">
      <article className="card">
        <h2>Welcome</h2>
        <p>Build your predictions, review affected fixtures, and commit before each lock deadline.</p>
        <p className={affectedMatches > 0 ? 'warning' : 'success'}>
          {affectedMatches > 0
            ? 'Uncommitted changes pending — review and commit required.'
            : 'All changes committed'}
        </p>
        <p>{groupLocked ? 'Group stage is locked.' : 'Group stage will lock at first kickoff.'}</p>
      </article>
      <article className="card quick-links">
        <Link to="/my-picks">Go to My Picks</Link>
        <Link to="/league-table">View League Table</Link>
        <Link to="/comparison">Open Comparison</Link>
      </article>
    </section>
  );
}
