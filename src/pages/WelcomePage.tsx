export function WelcomePage() {
  return (
    <section className="stack">
      <article className="card">
        <h2>Welcome</h2>
        <p>
          This is a test for a World Cup / Euro prediction app. Pick tournament winners, predict
          scores and don&apos;t finish last! Please read the rules carefully. All group stage games
          MUST be predicted 15 minutes before the start of the tournament, and KO games will be
          locked 15mins before kick off. If you have any further questions, you can fuck off.
        </p>
      </article>

      <article className="card">
        <h3>Scoring System</h3>
        <p>
          Your total points come from match predictions, group standing accuracy, and tournament
          outcome picks. Details are in the sections below.
        </p>
      </article>

      <article className="card">
        <h3>Tournament Predictions</h3>
        <ul>
          <li>Champion: +6</li>
          <li>Runner-up: +5</li>
          <li>Third place (bronze match winner): +4</li>
          <li>Fourth place (bronze match loser): +3</li>
        </ul>
        <p>
          Enter these on the Tournament Results tab. They lock 15 minutes before the first match
          kickoff.
        </p>
      </article>

      <article className="card">
        <h3>Match Points</h3>
        <ul>
          <li>Correct win/draw/loss: +2 points</li>
          <li>Exact score bonus: +4 additional points (6 total when exact)</li>
          <li>Quarter-finals: 1.5× match points</li>
          <li>Semi-finals: 2× match points</li>
          <li>Final and third-place play-off: 3× match points</li>
        </ul>
      </article>

      <article className="card">
        <h3>Group Standings Bonus</h3>
        <p>
          +1 point for each team you place in the exact correct finishing position within its group
          (1st through 4th).
        </p>
      </article>

      <article className="card">
        <h3>Deadlines</h3>
        <ul>
          <li>
            Tournament result predictions and all group-stage predictions lock 15 minutes before
            the first match kickoff.
          </li>
          <li>Each knockout fixture locks 15 minutes before that fixture&apos;s kickoff.</li>
          <li>Knockout draws require choosing which team progresses (extra time / penalties).</li>
        </ul>
      </article>

      <article className="card">
        <h3>Tie Breakers</h3>
        <ol>
          <li>Most exact scores</li>
          <li>Most correct results</li>
          <li>Most exact group-position calls</li>
          <li>Most correct tournament result predictions</li>
          <li>Virtual coin flip (after the tournament final result is in)</li>
        </ol>
      </article>
    </section>
  );
}
