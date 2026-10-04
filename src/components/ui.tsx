import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, BadgeCheck, X, Sparkles, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { initials, STATUS_STYLE } from '../lib/format';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-rose ${className}`} />;
}

export function PageLoader({ label = 'Aligning the stars…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-gold-light/40" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-rose border-r-gold animate-spin" />
        <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-gold" />
      </div>
      <p className="font-serif italic text-muted text-lg">{label}</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({ icon: Icon = Sparkles, title, text, action }: { icon?: any; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-blush blur-xl opacity-70" />
        <div className="relative h-16 w-16 rounded-full gold-border flex items-center justify-center"><Icon className="h-7 w-7 text-gold" /></div>
      </div>
      <h3 className="font-serif text-2xl font-semibold text-plum">{title}</h3>
      {text && <p className="text-muted text-sm mt-2 max-w-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-8 flex flex-col items-center text-center">
      <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center mb-3"><AlertTriangle className="h-6 w-6 text-danger" /></div>
      <h3 className="font-serif text-xl font-semibold">The stars are clouded</h3>
      <p className="text-sm text-muted mt-1 max-w-md">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn btn-outline btn-sm mt-4"><RefreshCw className="h-4 w-4" /> Try again</button>}
    </div>
  );
}

export function Stars({ value = 0, size = 14, className = '' }: { value?: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? 'fill-gold text-gold' : 'text-gold-light'} />
      ))}
    </span>
  );
}

export function Verified({ className = 'h-4 w-4' }: { className?: string }) {
  return <BadgeCheck className={`${className} text-white fill-[#C9A04A] shrink-0`} aria-label="Verified astrologer" />;
}

export function StatusPill({ online, className = '' }: { online: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2 py-0.5 ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'} ${className}`}>
      <span className={`relative h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-stone-400'}`}>
        {online && <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping" />}
      </span>
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

export function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLE[status] || 'bg-stone-100 text-stone-600'}`}>{children || String(status).replace('_', ' ')}</span>;
}

export function Avatar({ src, name, size = 40, className = '' }: { src?: string | null; name?: string; size?: number; className?: string }) {
  if (src) return <img src={src} alt={name} style={{ width: size, height: size }} className={`rounded-full object-cover ${className}`} />;
  return <div style={{ width: size, height: size, fontSize: size * 0.36 }} className={`rounded-full bg-rosegold-grad text-white flex items-center justify-center font-medium ${className}`}>{initials(name)}</div>;
}

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  const w = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-plum-deep/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className={`relative w-full ${w} bg-pearl rounded-t-[1.75rem] sm:rounded-[1.75rem] shadow-2xl max-h-[92vh] overflow-y-auto border border-line`}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-3 bg-pearl/95 backdrop-blur">
              <h3 className="font-serif text-2xl font-semibold text-plum">{title}</h3>
              <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-cream flex items-center justify-center" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Ornament({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold" />
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gold" fill="currentColor"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" /></svg>
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold" />
    </div>
  );
}

export function SectionHeading({ eyebrow, title, accent, subtitle, align = 'center', action }: { eyebrow?: string; title: string; accent?: string; subtitle?: string; align?: 'center' | 'left'; action?: ReactNode }) {
  const center = align === 'center';
  return (
    <div className={`mb-10 ${center ? 'text-center' : 'flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4'}`}>
      <div className={center ? 'max-w-2xl mx-auto' : ''}>
        {eyebrow && <p className={`text-[11px] tracking-[0.35em] uppercase text-gold-deep font-medium mb-3 ${center ? '' : ''}`}>{eyebrow}</p>}
        <h2 className="font-display text-3xl sm:text-4xl text-plum leading-tight">
          {title} {accent && <span className="font-serif italic font-medium text-rose-grad normal-case">{accent}</span>}
        </h2>
        {center && <Ornament className="mt-4" />}
        {subtitle && <p className="text-muted mt-4 leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className={center ? 'mt-6' : ''}>{action}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className = '' }: { tabs: { key: string; label: string; count?: number }[]; value: string; onChange: (k: string) => void; className?: string }) {
  return (
    <div className={`flex gap-1 p-1 rounded-full bg-cream/80 border border-line overflow-x-auto scrollbar-none ${className}`}>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)} className={`relative px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${value === t.key ? 'text-white' : 'text-ink/70 hover:text-plum'}`}>
          {value === t.key && <motion.span layoutId={`tab-${tabs.map((x) => x.key).join('')}`} className="absolute inset-0 rounded-full bg-plum shadow-soft" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
          <span className="relative">{t.label}{t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}</span>
        </button>
      ))}
    </div>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error ? <span className="text-xs text-danger mt-1 block">{error}</span> : hint ? <span className="text-xs text-muted mt-1 block">{hint}</span> : null}
    </label>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'rose' }: { icon: any; label: string; value: ReactNode; sub?: ReactNode; tone?: 'rose' | 'gold' | 'plum' | 'green' }) {
  const tones = { rose: 'bg-blush text-rose-deep', gold: 'bg-[#FFF3D9] text-gold-deep', plum: 'bg-lilac text-plum', green: 'bg-emerald-50 text-emerald-700' };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
        <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="h-4.5 w-4.5" /></span>
      </div>
      <p className="font-serif text-3xl font-semibold mt-2 text-ink">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}
