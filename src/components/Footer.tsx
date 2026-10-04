import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, ShieldCheck, Lock, BadgeCheck } from 'lucide-react';
import Brand from './Brand';
import { StarField } from './Celestial';
import { SIGNS, g } from '../lib/zodiac';

export function StoreBadges({ dark = true }: { dark?: boolean }) {
  const cls = dark ? 'bg-plum-deep text-white border-white/15' : 'bg-white text-plum border-line';
  return (
    <div className="flex flex-wrap gap-3">
      <a href="#app" className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 hover:-translate-y-0.5 transition ${cls}`}>
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M16.37 12.62c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28z" /></svg>
        <span className="leading-tight"><span className="block text-[10px] opacity-70">Download on the</span><span className="block font-medium">App Store</span></span>
      </a>
      <a href="#app" className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 hover:-translate-y-0.5 transition ${cls}`}>
        <svg viewBox="0 0 24 24" className="h-6 w-6"><path fill="#E8CD8A" d="M3.6 2.2 13.4 12l-9.8 9.8c-.36-.2-.6-.6-.6-1.1V3.3c0-.5.24-.9.6-1.1z" /><path fill="#E07A95" d="m16.8 8.6-3.4 3.4-9.8-9.8c.3-.17.7-.2 1.07 0z" /><path fill="#C9A04A" d="m16.8 15.4-12.13 6.4c-.37.2-.77.17-1.07 0l9.8-9.8z" /><path fill="#B76E79" d="m20.3 10.5-3.5-1.9-3.4 3.4 3.4 3.4 3.5-1.9c.97-.52.97-1.9 0-3z" /></svg>
        <span className="leading-tight"><span className="block text-[10px] opacity-70">Get it on</span><span className="block font-medium">Google Play</span></span>
      </a>
    </div>
  );
}

export default function Footer() {
  const cols = [
    { title: 'Consult', links: [['Chat with Astrologer', '/astrologers'], ['Talk to Astrologer', '/astrologers?mode=audio'], ['Video Consultation', '/astrologers?mode=video'], ['Book a Session', '/astrologers']] },
    { title: 'Explore', links: [['Daily Horoscope', '/horoscope'], ['Free Kundli', '/kundli'], ['Astro Journal', '/blog'], ['Top Astrologers', '/astrologers']] },
    { title: 'Account', links: [['My Dashboard', '/dashboard'], ['Wallet', '/dashboard/wallet'], ['Bookings', '/dashboard/bookings'], ['Help & Support', '/dashboard/support']] },
    { title: 'Legal', links: [['Terms of Service', '/legal/terms'], ['Privacy Policy', '/legal/privacy'], ['Refunds & Cancellation', '/legal/refunds'], ['Disclaimer', '/legal/disclaimer'], ['Astrologer Agreement', '/legal/astrologer-agreement'], ['Grievance Redressal', '/legal/grievance']] },
  ];
  return (
    <footer className="relative bg-plum-grad text-white/80 overflow-hidden mt-10">
      <StarField count={50} seed={11} color="#E8CD8A" className="opacity-60" />
      <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-28 lg:pb-10">
        <div className="flex flex-wrap justify-center gap-4 sm:gap-7 mb-14 text-gold-light/70 text-2xl font-serif">
          {SIGNS.map((s) => <Link key={s.key} to={`/horoscope/${s.key}`} title={s.name} className="hover:text-gold-light hover:-translate-y-0.5 transition">{g(s.glyph)}</Link>)}
        </div>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Brand light />
            <p className="mt-5 text-sm leading-relaxed text-white/65 max-w-xs">Guided by stars, empowered by you. Astro Venus connects you with verified Vedic astrologers, tarot readers and numerologists — privately, instantly, beautifully.</p>
            <div className="mt-5 space-y-2 text-sm text-white/65">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gold-light" /> care@astrovenus.com</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold-light" /> +91 7698 601 309</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold-light" /> Bengaluru, India</p>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-sm tracking-[0.2em] text-gold-light mb-4">{c.title.toUpperCase()}</h4>
              <ul className="space-y-2.5 text-sm">
                {c.links.map(([l, to]) => <li key={l}><Link to={to} className="text-white/65 hover:text-white transition">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-5 text-xs text-white/60">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-gold-light" /> 100% private consultations</span>
            <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-gold-light" /> KYC-verified astrologers</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-gold-light" /> Secure payments</span>
          </div>
          <StoreBadges />
        </div>
        <p className="mt-8 text-xs text-white/45 text-center lg:text-left">© {new Date().getFullYear()} Astro Venus. Astrological guidance is for insight and reflection and is not a substitute for professional medical, legal or financial advice.</p>
      </div>
    </footer>
  );
}
