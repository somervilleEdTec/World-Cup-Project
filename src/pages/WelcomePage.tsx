import { Link } from 'react-router-dom';

export function WelcomePage() {
  return (
    <section className="stack">
      <article className="card">
        <h2>Welcome</h2>
        <p>Build your predictions, review affected fixtures, and commit before each lock deadline.</p>
        <p className="warning">Uncommitted changes must be reviewed and committed before they count at lock.</p>
      </article>
      <article className="card quick-links">
        <Link to="/my-picks">Go to My Picks</Link>
        <Link to="/league-table">View League Table</Link>
        <Link to="/comparison">Open Comparison</Link>
        <Link to="/admin">Admin controls</Link>
      </article>
    </section>
  );
}
