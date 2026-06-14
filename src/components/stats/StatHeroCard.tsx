interface StatHeroCardProps {
  subtitle: string;
  title: string;
  value: string;
  detail: string;
  variant?: 'default' | 'consensus' | 'chaos';
}

export function StatHeroCard({
  subtitle,
  title,
  value,
  detail,
  variant = 'default'
}: StatHeroCardProps) {
  return (
    <article className={`stat-hero-card stat-hero-card-${variant}`}>
      <p className="crowd-stat-panel-kicker">{subtitle}</p>
      <p className="stat-hero-kicker">{title}</p>
      <p className="stat-hero-value">{value}</p>
      <p className="stat-hero-detail">{detail}</p>
    </article>
  );
}
