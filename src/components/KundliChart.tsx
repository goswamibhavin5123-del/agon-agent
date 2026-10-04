import { RASHIS } from '../lib/kundli';

const CENTERS: [number, number][] = [
  [200, 110], [100, 45], [45, 100], [110, 200], [45, 300], [100, 355], [200, 290], [300, 355], [355, 300], [290, 200], [355, 100], [300, 45],
];
const SIGN_POS: [number, number][] = [
  [200, 175], [100, 88], [88, 100], [175, 200], [88, 300], [100, 312], [200, 225], [300, 312], [312, 300], [225, 200], [312, 100], [300, 88],
];

export default function KundliChart({ houses, ascDegree }: { houses: any[]; ascDegree?: number }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-[440px] mx-auto drop-shadow-sm">
      <defs>
        <linearGradient id="kbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFDF9" /><stop offset="100%" stopColor="#FBE3EA" /></linearGradient>
        <linearGradient id="kstroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#B8862F" /><stop offset="50%" stopColor="#E8CD8A" /><stop offset="100%" stopColor="#9A7424" /></linearGradient>
      </defs>
      <rect x="4" y="4" width="392" height="392" rx="14" fill="url(#kbg)" stroke="url(#kstroke)" strokeWidth="3" />
      <path d="M200 202 L6 6 M394 6 L6 394 M200 4 L396 200 L200 396 L4 200 Z M4 4 L396 396" fill="none" stroke="url(#kstroke)" strokeWidth="1.6" />
      <path d="M200 4 L396 200 L200 396 L4 200 Z" fill="rgba(241,232,246,0.45)" stroke="none" />
      <path d="M200 4 L300 104 L200 200 L100 104 Z" fill="rgba(232,205,138,0.18)" />
      {houses.map((h, i) => {
        const [cx, cy] = CENTERS[i];
        const [sx, sy] = SIGN_POS[i];
        const pl: string[] = h.planets || [];
        return (
          <g key={i}>
            <text x={sx} y={sy} fontSize="11" fill="#B76E79" textAnchor="middle" dominantBaseline="central" fontWeight="600">{h.sign + 1}</text>
            {i === 0 && <text x={cx} y={cy - 26} fontSize="10" fill="#9A7424" textAnchor="middle" letterSpacing="2">ASC</text>}
            {pl.map((p, j) => {
              const cols = pl.length > 2 ? 2 : 1;
              const row = Math.floor(j / cols);
              const col = j % cols;
              const dx = cols === 2 ? (col === 0 ? -14 : 14) : 0;
              const rows = Math.ceil(pl.length / cols);
              const dy = (row - (rows - 1) / 2) * 16;
              return <text key={p} x={cx + dx} y={cy + dy} fontSize="13" fill="#4A2358" textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="Jost, sans-serif">{p}</text>;
            })}
          </g>
        );
      })}
      <title>{`North Indian chart · Lagna ${RASHIS[houses[0]?.sign ?? 0]}${ascDegree !== undefined ? ` ${ascDegree.toFixed(1)}°` : ''}`}</title>
    </svg>
  );
}
