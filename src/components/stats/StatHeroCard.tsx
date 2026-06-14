interface StatHeroCardProps {
  subtitle: string;
  value: string;
  detail: string;
  variant?: 'default' | 'consensus' | 'chaos';
}

export function StatHeroCard({
  subtitle,
  value,
  detail,
  variant = 'default'
}: StatHeroCardProps) {
  return (
    <article className={`stat-hero-card stat-hero-card-${variant}`}>
      <p className="crowd-stat-panel-kicker">{subtitle}</p>
      <p className="stat-hero-value">{value}</p>
      <p className="stat-hero-detail">{detail}</p>
    </article>
  );
}
