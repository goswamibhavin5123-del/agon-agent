import { useMemo } from 'react';
import { SIGNS, g } from '../lib/zodiac';

function rand(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

export function StarField({ count = 40, seed = 7, className = '', color = '#C9A04A' }: { count?: number; seed?: number; className?: string; color?: string }) {
  const stars = useMemo(() => {
    const r = rand(seed);
    return Array.from({ length: count }, () => ({ x: r() * 100, y: r() * 100, s: 0.6 + r() * 2.2, d: r() * 4, sparkle: r() > 0.85 }));
  }, [count, seed]);
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {stars.map((st, i) => st.sparkle ? (
        <svg key={i} viewBox="0 0 24 24" className="absolute animate-twinkle" style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s * 6, height: st.s * 6, animationDelay: `${st.d}s`, color }} fill="currentColor">
          <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" />
        </svg>
      ) : (
        <span key={i} className="absolute rounded-full animate-twinkle" style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, background: color, animationDelay: `${st.d}s` }} />
      ))}
    </div>
  );
}

export function ZodiacWheel({ className = '', stroke = '#C9A04A' }: { className?: string; stroke?: string }) {
  const R = 200;
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <circle cx={R} cy={R} r={196} fill="none" stroke={stroke} strokeWidth="1" opacity="0.7" />
      <circle cx={R} cy={R} r={188} fill="none" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 4" opacity="0.6" />
      <circle cx={R} cy={R} r={150} fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.6" />
      {SIGNS.map((s, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180);
        const a2 = ((i * 30 + 15) - 90) * (Math.PI / 180);
        return (
          <g key={s.key}>
            <line x1={R + 150 * Math.cos(a)} y1={R + 150 * Math.sin(a)} x2={R + 188 * Math.cos(a)} y2={R + 188 * Math.sin(a)} stroke={stroke} strokeWidth="0.8" opacity="0.7" />
            <text x={R + 169 * Math.cos(a2)} y={R + 169 * Math.sin(a2)} fill={stroke} fontSize="17" textAnchor="middle" dominantBaseline="central" fontFamily="serif">{g(s.glyph)}</text>
          </g>
        );
      })}
      {Array.from({ length: 72 }).map((_, i) => {
        const a = i * 5 * (Math.PI / 180);
        return <line key={i} x1={R + 192 * Math.cos(a)} y1={R + 192 * Math.sin(a)} x2={R + 196 * Math.cos(a)} y2={R + 196 * Math.sin(a)} stroke={stroke} strokeWidth="0.6" opacity="0.6" />;
      })}
    </svg>
  );
}

export function Sparkle({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" /></svg>;
}
