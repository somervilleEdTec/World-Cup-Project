import { StatisticsPickCount } from '../../types';

const DONUT_COLORS = ['#19a974', '#0f2f56', '#d4a012', '#1c4d7f', '#b42318'];

interface ResultDonutProps {
  segments: StatisticsPickCount[];
}

export function ResultDonut({ segments }: ResultDonutProps) {
  if (segments.length === 0) return null;

  const { parts: gradientParts } = segments.reduce<{
    parts: string[];
    cumulative: number;
  }>(
    (acc, segment, index) => {
      const start = acc.cumulative;
      const end = start + segment.pct;
      const color = DONUT_COLORS[index % DONUT_COLORS.length];
      return {
        parts: [...acc.parts, `${color} ${start}% ${end}%`],
        cumulative: end
      };
    },
    { parts: [], cumulative: 0 }
  );

  return (
    <div className="result-donut-wrap">
      <div
        className="result-donut"
        style={{ background: `conic-gradient(${gradientParts.join(', ')})` }}
        aria-hidden="true"
      />
      <ul className="result-donut-legend">
        {segments.map((segment, index) => (
          <li key={segment.label}>
            <span
              className="result-donut-swatch"
              style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
            />
            {segment.label} ({segment.pct}%)
          </li>
        ))}
      </ul>
    </div>
  );
}
