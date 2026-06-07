export function WelcomePage() {
  return (
    <section className="stack">
      <article className="card">
        <h2>Welcome</h2>
        <p>
          World Cup Predictions for friends and family. Pick tournament winners, predict scores and
          don&apos;t finish last! Please read the rules carefully.
        </p>
        <p className="warning">
          <strong>Important:</strong> All group-stage matches must be predicted and locked before
          the deadline (15 minutes before the first match kickoff). Any group match you leave
          untouched when you lock a group counts as a <strong>0-0 draw</strong>.
        </p>
        <p>
          Knockout games lock 15 minutes before each fixture&apos;s kickoff. If you have any
          questions, you can fuck off!
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
        <h3>Group-stage match points</h3>
        <ul>
          <li>Correct win/draw/loss: +2 points</li>
          <li>Exact score bonus: +4 additional points (6 total when exact)</li>
        </ul>
      </article>

      <article className="card">
        <h3>Knockout match points</h3>
        <ul>
          <li>
            <strong>Correct advancing team:</strong> +2 points. You must pick a team to advance if
            FT score is a draw.
          </li>
          <li>
            <strong>Exact score bonus:</strong> +4 additional points when your predicted 90-minute
            scoreline matches the official result. Extra time and penalty-shootout goals are not
            included in this bonus.
          </li>
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
            Tournament result predictions and all group-stage predictions lock 15 minutes before the
            first match kickoff.
          </li>
          <li>
            Unpredicted group matches are treated as <strong>0-0 draws</strong>.
          </li>
          <li>
            Unpredicted KO matches are treated as <strong>0-0 draws</strong> and{' '}
            <strong>home team advance</strong>.
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
