import { StatisticsResponse } from '../../types';

interface FunFactsListProps {
  facts: StatisticsResponse['funFacts'];
}

export function FunFactsList({ facts }: FunFactsListProps) {
  if (facts.length === 0) return null;

  return (
    <article className="card">
      <h3>Fun Facts</h3>
      <ul className="fun-facts-list">
        {facts.map((fact) => (
          <li key={fact.text} className="fun-fact-card">
            <span className="fun-fact-icon" aria-hidden="true">
              {fact.icon}
            </span>
            <span>{fact.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
