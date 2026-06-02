import { Link } from 'react-router-dom';

export function WelcomePage() {
  return (
    <section className="stack">
      <article className="card">
        <h2>Welcome</h2>
        <p>World Cup Boys — Welcome to the Shiva Bowl. Pick tournament results, group scores, and knockout fixtures.</p>
      </article>

      <article className="card quick-links">
        <Link to="/my-picks">Go to My Picks</Link>
        <Link to="/league-table">View League Table</Link>
        <Link to="/comparison">Open Comparison</Link>
      </article>

      <article className="card">
        <h3>How scoring works</h3>
        <h4>Match points</h4>
        <ul>
          <li>Correct win/draw/loss: +1 point</li>
          <li>Exact score bonus: +5 additional points (6 total when exact)</li>
        </ul>
      </article>

      <article className="card">
        <h3>Group standings bonus</h3>
        <p>+2 points for each team you place in the exact correct finishing position within its group (1st through 4th).</p>
      </article>

      <article className="card">
        <h3>Tournament result picks</h3>
        <ul>
          <li>Champion: +10</li>
          <li>Runner-up: +8</li>
          <li>Third place (bronze match winner): +6</li>
          <li>Fourth place (bronze match loser): +4</li>
        </ul>
        <p>Pick these on the Tournament Results tab. They lock at the first match kickoff.</p>
      </article>

      <article className="card">
        <h3>Locks</h3>
        <ul>
          <li>Tournament result picks lock at the first match kickoff.</li>
          <li>Group-stage picks lock at the first match kickoff.</li>
          <li>Each knockout fixture locks at its own kickoff (rolling lock).</li>
          <li>Knockout draws require choosing which team progresses (extra time / penalties).</li>
        </ul>
      </article>

      <article className="card">
        <h3>Tie-breakers</h3>
        <ol>
          <li>Most exact scores</li>
          <li>Most correct results</li>
          <li>Most exact group-position calls</li>
          <li>Most correct tournament result picks</li>
          <li>Earliest valid save timestamp</li>
        </ol>
      </article>
    </section>
  );
}
