import { Link } from 'react-router-dom';

export const LOGO = '/rahutalk-logo.png';

export function BrandMark({
  size = 44,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-block rounded-full overflow-hidden ring-2 ring-gold-light/80 shadow-lux bg-pearl shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={LOGO}
        alt="Rahu Talk"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export default function Brand({
  light = false,
  to = '/',
  size = 44,
  sub = 'Guided by the stars',
}: {
  light?: boolean;
  to?: string;
  size?: number;
  sub?: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 group"
      aria-label="Rahu Talk home"
    >
      <BrandMark size={size} />

      <span className="leading-none">
        <span className="block font-display text-[1.15rem] font-semibold tracking-[0.14em] text-gold-grad">
          RAHU TALK
        </span>

        <span
          className={`block text-[9px] tracking-[0.34em] uppercase mt-1.5 ${
            light ? 'text-gold-light/80' : 'text-muted'
          }`}
        >
          {sub}
        </span>
      </span>
    </Link>
  );
}