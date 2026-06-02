export function RulesPage() {
  return (
    <section className="stack">
      <article className="card">
        <h2>How scoring works</h2>
        <p>Official rules for World Cup Boys — Welcome to the Shiva Bowl.</p>
      </article>

      <article className="card">
        <h3>Match points</h3>
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
        <h3>Tournament bonus picks</h3>
        <ul>
          <li>Champion: +10</li>
          <li>Runner-up: +8</li>
          <li>Third place (bronze match winner): +6</li>
          <li>Fourth place (bronze match loser): +4</li>
        </ul>
        <p>Submitted with group-stage picks and locked at first tournament kickoff.</p>
      </article>

      <article className="card">
        <h3>Locks and commits</h3>
        <ul>
          <li>Only committed picks count when a lock triggers; drafts are ignored.</li>
          <li>Group-stage picks and bonus selections lock at the first match kickoff.</li>
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
          <li>Most correct tournament bonus picks</li>
          <li>Earliest valid commit timestamp</li>
        </ol>
      </article>
    </section>
  );
}
