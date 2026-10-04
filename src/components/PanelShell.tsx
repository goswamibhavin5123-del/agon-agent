import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { BrandMark } from './Brand';

export interface PanelItem { to: string; label: string; icon: any; badge?: number | string; end?: boolean }

export default function PanelShell({ items, title, subtitle, children, topRight, footer, dark = false }: { items: PanelItem[]; title: string; subtitle?: string; children: ReactNode; topRight?: ReactNode; footer?: ReactNode; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const current = items.find((i) => (i.end ? loc.pathname === i.to : loc.pathname.startsWith(i.to))) || items[0];

  const sidebar = (
    <div className={`h-full flex flex-col ${dark ? 'bg-plum-grad text-white' : 'bg-pearl'}`}>
      <Link to="/" className="flex items-center gap-3 px-5 h-[72px] shrink-0">
        <BrandMark size={38} />
        <span className="leading-none">
          <span className="block font-display text-[0.98rem] font-semibold tracking-[0.14em] text-gold-grad">ASTRO VENUS</span>
          <span className={`block text-[9px] tracking-[0.3em] uppercase mt-1 ${dark ? 'text-gold-light/70' : 'text-muted'}`}>{title}</span>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5 scrollbar-none">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive ? (dark ? 'bg-white/12 text-white shadow-inner' : 'bg-blush text-rose-deep font-medium') : dark ? 'text-white/65 hover:bg-white/8 hover:text-white' : 'text-ink/70 hover:bg-cream hover:text-plum'}`}>
            <i.icon className={`h-[18px] w-[18px] shrink-0 ${dark ? 'text-gold-light' : ''}`} />
            <span className="flex-1">{i.label}</span>
            {i.badge ? <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${dark ? 'bg-rose text-white' : 'bg-rose text-white'}`}>{i.badge}</span> : null}
          </NavLink>
        ))}
      </nav>
      {footer && <div className={`p-3 border-t ${dark ? 'border-white/10' : 'border-line'}`}>{footer}</div>}
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className={`hidden lg:block sticky top-0 h-screen border-r ${dark ? 'border-white/10' : 'border-line'}`}>{sidebar}</aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[70] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-plum-deep/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute left-0 top-0 bottom-0 w-[80%] max-w-[280px] shadow-2xl">
              {sidebar}
              <button onClick={() => setOpen(false)} className="absolute top-4 -right-12 h-10 w-10 rounded-full bg-pearl flex items-center justify-center"><X className="h-5 w-5" /></button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-ivory/85 backdrop-blur-xl border-b border-line">
          <div className="h-16 px-4 sm:px-8 flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden h-10 w-10 rounded-full hover:bg-cream flex items-center justify-center" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <Link to="/" className="hidden sm:flex lg:hidden"><BrandMark size={32} /></Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted">{subtitle || title}</p>
              <h1 className="font-serif text-xl sm:text-2xl font-semibold text-plum truncate">{current?.label}</h1>
            </div>
            <Link to="/" className="hidden md:inline-flex btn btn-ghost btn-sm"><ArrowLeft className="h-4 w-4" /> Website</Link>
            {topRight}
          </div>
          <div className="lg:hidden flex gap-1.5 overflow-x-auto scrollbar-none px-4 pb-3">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `chip shrink-0 ${isActive ? 'chip-active' : ''}`}><i.icon className="h-3.5 w-3.5" />{i.label}</NavLink>
            ))}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-8 pb-24">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>{children}</motion.div>
        </main>
      </div>
    </div>
  );
}
