import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Wallet, Menu, X, LayoutDashboard, LogOut, Sparkles, ChevronDown, ShieldCheck, Star, User } from 'lucide-react';
import Brand from './Brand';
import { useAuth, homeFor } from '../contexts/AuthContext';
import { Avatar } from './ui';
import { inr } from '../lib/format';

export const NAV = [
  { to: '/', label: 'Home' },
  { to: '/astrologers', label: 'Astrologers' },
  { to: '/horoscope', label: 'Horoscope' },
  { to: '/kundli', label: 'Kundli' },
  { to: '/blog', label: 'Journal' },
];

export default function Header() {
  const { user, profile, role, signOut } = useAuth();
  const isCustomer = role === 'customer';
  const home = homeFor(role);
  const menuItems = role === 'admin'
    ? [{ to: '/admin', icon: ShieldCheck, label: 'Admin Console' }, { to: '/launch-checklist', icon: LayoutDashboard, label: 'Launch checklist' }]
    : role === 'astrologer'
      ? [{ to: '/astro-panel', icon: Star, label: 'Astrologer Panel' }, { to: '/astro-panel/profile', icon: User, label: 'My profile' }]
      : [{ to: '/dashboard', icon: LayoutDashboard, label: 'My Dashboard' }, { to: '/dashboard/profile', icon: User, label: 'Profile' }, { to: '/dashboard/wallet', icon: Wallet, label: `Wallet · ${inr(profile?.wallet_balance || 0)}` }];
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => { setOpen(false); setMenu(false); }, [loc.pathname]);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 10);
    f();
    window.addEventListener('scroll', f);
    return () => window.removeEventListener('scroll', f);
  }, []);

  const name = profile?.full_name || user?.email?.split('@')[0];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-pearl/85 backdrop-blur-xl border-b border-line shadow-[0_8px_30px_-20px_rgba(74,35,88,0.35)]' : 'bg-transparent'}`}>
      <div className="hidden md:block bg-plum-grad text-gold-light/90 text-[11px] tracking-[0.2em] uppercase">
        <div className="max-w-7xl mx-auto px-6 h-8 flex items-center justify-between">
          <span className="flex items-center gap-2"><Sparkles className="h-3 w-3" /> First consultation? Enjoy ₹250 in your wallet on sign-up</span>
          <span className="flex gap-5"><Link to="/legal/astrologer-agreement" className="hover:text-white">For Astrologers</Link><Link to="/legal/grievance" className="hover:text-white">Support</Link></span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-4">
        <Brand />
        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `relative px-4 py-2 text-[0.92rem] rounded-full transition ${isActive ? 'text-plum font-medium' : 'text-ink/70 hover:text-plum'}`}>
              {({ isActive }) => (<>{n.label}{isActive && <motion.span layoutId="nav-dot" className="absolute left-1/2 -bottom-0.5 h-1 w-1 -translate-x-1/2 rounded-full bg-rose" />}</>)}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isCustomer && <Link to="/dashboard/wallet" className="hidden sm:flex items-center gap-2 rounded-full gold-border px-3.5 py-2 text-sm font-medium text-gold-deep hover:shadow-lux transition">
                <Wallet className="h-4 w-4" /> {inr(profile?.wallet_balance || 0)}
              </Link>}
              <Link to={role === 'admin' ? '/admin/notifications' : role === 'astrologer' ? '/astro-panel/notifications' : '/dashboard/notifications'} className="h-10 w-10 rounded-full hover:bg-cream flex items-center justify-center text-plum" aria-label="Notifications"><Bell className="h-5 w-5" /></Link>
              <div className="relative">
                <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-cream">
                  <Avatar src={profile?.avatar} name={name} size={34} className="ring-2 ring-gold-light" />
                  <ChevronDown className="h-4 w-4 text-muted hidden sm:block" />
                </button>
                <AnimatePresence>
                  {menu && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute right-0 mt-2 w-64 card p-2 shadow-lux z-50">
                      <div className="px-3 py-2.5 border-b border-line mb-1">
                        <p className="font-medium truncate">{name}</p>
                        <p className="text-xs text-muted truncate">{user.email}</p>
                      </div>
                      <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-gold-deep">{role} account</p>
                      {menuItems.map((i) => (
                        <Link key={i.to} to={i.to} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-cream"><i.icon className="h-4 w-4 text-gold-deep" />{i.label}</Link>
                      ))}
                      <button onClick={async () => { await signOut(); nav('/'); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-rose-50 text-danger"><LogOut className="h-4 w-4" /> Sign out</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">Sign in</Link>
              <Link to="/astrologers" className="btn btn-rose btn-sm">Consult Now</Link>
            </>
          )}
          <button onClick={() => setOpen(true)} className="lg:hidden h-10 w-10 rounded-full hover:bg-cream flex items-center justify-center" aria-label="Menu"><Menu className="h-5 w-5" /></button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[70] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-plum-deep/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute right-0 top-0 bottom-0 w-[84%] max-w-sm bg-pearl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8"><Brand size={40} /><button onClick={() => setOpen(false)} className="h-10 w-10 rounded-full hover:bg-cream flex items-center justify-center"><X className="h-5 w-5" /></button></div>
              <nav className="flex flex-col gap-1">
                {NAV.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `px-4 py-3 rounded-2xl font-serif text-xl ${isActive ? 'bg-blush text-rose-deep' : 'text-plum hover:bg-cream'}`}>{n.label}</NavLink>
                ))}
              </nav>
              <div className="mt-auto space-y-2">
                {user ? (
                  <>
                    <Link to={home} className="btn btn-plum w-full"><LayoutDashboard className="h-4 w-4" /> {role === 'admin' ? 'Admin Console' : role === 'astrologer' ? 'Astrologer Panel' : 'Dashboard'}</Link>
                  </>
                ) : (
                  <Link to="/login" className="btn btn-rose w-full">Sign in / Sign up</Link>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
