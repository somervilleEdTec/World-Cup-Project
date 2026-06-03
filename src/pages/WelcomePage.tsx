import { Link } from 'react-router-dom';

export function WelcomePage() {
  return (
    <section className="stack">
      <article className="card">
        <h2>Welcome</h2>
        <p>
          World Cup Boys — Welcome to the Shiva Bowl. Enter tournament results, group scores, and
          knockout predictions.
        </p>
      </article>

      <article className="card quick-links">
        <Link to="/my-picks">Go to My Predictions</Link>
        <Link to="/league-table">View League Table</Link>
        <Link to="/comparison">Open Comparison</Link>
      </article>

      <article className="card">
        <h3>How scoring works</h3>
        <h4>Match points</h4>
        <ul>
          <li>Correct win/draw/loss: +2 points</li>
          <li>Exact score bonus: +4 additional points (6 total when exact)</li>
          <li>Quarter-finals: 1.5× match points</li>
          <li>Semi-finals: 2× match points</li>
          <li>Final and third-place play-off: 3× match points</li>
        </ul>
      </article>

      <article className="card">
        <h3>Group standings bonus</h3>
        <p>
          +1 point for each team you place in the exact correct finishing position within its group
          (1st through 4th).
        </p>
      </article>

      <article className="card">
        <h3>Tournament result predictions</h3>
        <ul>
          <li>Champion: +6</li>
          <li>Runner-up: +5</li>
          <li>Third place (bronze match winner): +4</li>
          <li>Fourth place (bronze match loser): +3</li>
        </ul>
        <p>Enter these on the Tournament Results tab. They lock at the first match kickoff.</p>
      </article>

      <article className="card">
        <h3>Locks</h3>
        <ul>
          <li>Tournament result predictions lock at the first match kickoff.</li>
          <li>Group-stage predictions lock at the first match kickoff.</li>
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
          <li>Most correct tournament result predictions</li>
          <li>Earliest valid save timestamp</li>
        </ol>
      </article>
    </section>
  );
}
