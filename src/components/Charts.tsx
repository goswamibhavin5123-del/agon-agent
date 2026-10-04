import { useState } from 'react';

export function AreaChart({ data, height = 200, color = '#D9678A', prefix = '' }: { data: { label: string; value: number }[]; height?: number; color?: string; prefix?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data?.length) return null;
  const W = 600, H = height, pad = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const area = `${path} L${x(data.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;
  const id = `g${color.replace('#', '')}`;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => <line key={t} x1={pad} x2={W - pad} y1={y(max * t)} y2={y(max * t)} stroke="#EBDDCB" strokeDasharray="3 5" />)}
        <path d={area} fill={`url(#${id})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            <rect x={x(i) - (W / data.length) / 2} y={0} width={W / data.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
            {hover === i && <><line x1={x(i)} x2={x(i)} y1={pad} y2={H - pad} stroke={color} strokeOpacity="0.3" /><circle cx={x(i)} cy={y(d.value)} r="5" fill="#fff" stroke={color} strokeWidth="2.5" /></>}
          </g>
        ))}
        {data.map((d, i) => (i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) && <text key={`l${i}`} x={x(i)} y={H - 4} fontSize="11" textAnchor="middle" fill="#8C7882">{d.label}</text>)}
      </svg>
      {hover !== null && (
        <div className="absolute top-0 pointer-events-none card px-3 py-1.5 text-xs" style={{ left: `calc(${(x(hover) / W) * 100}% - 40px)` }}>
          <span className="text-muted">{data[hover].label}</span> <b>{prefix}{data[hover].value.toLocaleString('en-IN')}</b>
        </div>
      )}
    </div>
  );
}

export function BarList({ data, color = 'bg-rose-grad', prefix = '' }: { data: { label: string; value: number }[]; color?: string; prefix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between text-sm mb-1"><span className="capitalize">{d.label}</span><span className="font-medium">{prefix}{d.value.toLocaleString('en-IN')}</span></div>
          <div className="h-2 rounded-full bg-cream overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${(d.value / max) * 100}%`, transition: 'width .8s ease' }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ data, size = 160 }: { data: { label: string; value: number }[]; size?: number }) {
  const colors = ['#D9678A', '#C9A04A', '#4A2358', '#B76E79', '#E8CD8A'];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const r = 60, c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" style={{ width: size, height: size }} className="-rotate-90 shrink-0">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#F5EBDD" strokeWidth="20" />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = <circle key={d.label} cx="80" cy="80" r={r} fill="none" stroke={colors[i % colors.length]} strokeWidth="20" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} />;
          acc += len;
          return el;
        })}
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span className="capitalize text-muted">{d.label}</span>
            <span className="font-medium">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
