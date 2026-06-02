import { flagImageUrl } from '../lib/flagUrl';

interface CountryFlagProps {
  countryCode: string;
  title?: string;
  className?: string;
}

export function CountryFlag({ countryCode, title, className = '' }: CountryFlagProps) {
  const label = title ?? countryCode.toUpperCase();
  return (
    <img
      className={`country-flag ${className}`.trim()}
      src={flagImageUrl(countryCode)}
      alt=""
      aria-hidden={title ? undefined : true}
      title={label}
      loading="lazy"
      decoding="async"
    />
  );
}
