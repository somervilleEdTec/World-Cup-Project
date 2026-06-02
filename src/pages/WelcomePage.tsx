import { Link } from 'react-router-dom';

export function WelcomePage() {
  return (
    <section className="stack">
      <article className="card">
        <h2>Welcome</h2>
        <p>Build your predictions, review affected fixtures, and commit before each lock deadline.</p>
        <p className="warning">
          Uncommitted edits will not count. Last committed picks will be locked.
        </p>
      </article>
      <article className="card quick-links">
        <Link to="/my-picks">Go to My Picks</Link>
        <Link to="/league-table">View League Table</Link>
        <Link to="/comparison">Open Comparison</Link>
      </article>
    </section>
  );
}
