import { useState } from 'react';
import { OverallPicksResponse } from '../../types';
import { OverallPicksConsensus } from './OverallPicksConsensus';
import { OverallPicksMatrix } from './OverallPicksMatrix';

type OverallLayout = 'table' | 'consensus';

interface OverallPicksPanelProps {
  data: OverallPicksResponse;
}

export function OverallPicksPanel({ data }: OverallPicksPanelProps) {
  const [layout, setLayout] = useState<OverallLayout>('table');
  const { meta, entries } = data;
  const revealNames = meta.groupPhaseLocked;

  return (
    <section className="stack">
      <article className="card">
        <h3>Tournament podium picks</h3>
        <p className="kicker">{meta.message}</p>
        <div className="picks-phase-tabs overall-picks-layout-tabs" role="tablist" aria-label="Layout">
          <button
            type="button"
            role="tab"
            aria-selected={layout === 'table'}
            className={layout === 'table' ? 'active-tab' : undefined}
            onClick={() => setLayout('table')}
          >
            Table
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={layout === 'consensus'}
            className={layout === 'consensus' ? 'active-tab' : undefined}
            onClick={() => setLayout('consensus')}
          >
            Consensus
          </button>
        </div>
      </article>

      <article className="card overall-picks-content">
        {layout === 'table' && (
          <OverallPicksMatrix
            entries={entries}
            actualPlacings={meta.actualPlacings}
            revealNames={revealNames}
          />
        )}
        {layout === 'consensus' && (
          <OverallPicksConsensus entries={entries} revealNames={revealNames} />
        )}
      </article>
    </section>
  );
}
