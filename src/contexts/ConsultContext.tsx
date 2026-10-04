import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wallet, CalendarDays, Clock } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { api } from '../lib/api';
import { MODES, rateFor, inr } from '../lib/format';
import type { Mode } from '../lib/format';
import { Modal, Verified, StatusPill } from '../components/ui';

const Ctx = createContext<{ start: (a: any, mode: Mode) => void }>({ start: () => {} });

export function ConsultProvider({ children }: { children: ReactNode }) {
  const { user, profile, role } = useAuth();
  const [consent, setConsent] = useState(false);
  const { toast } = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [pending, setPending] = useState<{ a: any; mode: Mode } | null>(null);
  const [busy, setBusy] = useState(false);

  const start = (a: any, mode: Mode) => {
    if (!user) {
      toast('Please sign in to start your consultation', 'info');
      nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`);
      return;
    }
    if (role && role !== 'customer') { toast('Consultations are available to customer accounts only.', 'error'); return; }
    setConsent(false);
    setPending({ a, mode });
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const c = await api('/api/consultations', { method: 'POST', body: { action: 'start', astrologer_id: pending.a.id, mode: pending.mode, consent } });
      setPending(null);
      nav(`/consult/${c.id}`);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const a = pending?.a;
  const mode = pending?.mode || 'chat';
  const rate = a ? rateFor(a, mode) : 0;
  const balance = Number(profile?.wallet_balance || 0);
  const min = rate * 3;
  const M = MODES[mode];

  return (
    <Ctx.Provider value={{ start }}>
      {children}
      <Modal open={!!pending} onClose={() => setPending(null)} title={`Start ${M.label}`}>
        {a && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img src={a.photo} alt={a.name} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-gold-light" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-serif text-xl font-semibold">{a.name} {a.verified && <Verified />}</div>
                <p className="text-sm text-muted truncate">{a.title}</p>
                <StatusPill online={a.is_online} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-blush/60 p-3"><p className="text-[11px] uppercase tracking-wider text-muted">Rate</p><p className="font-semibold text-rose-deep">{inr(rate)}/min</p></div>
              <div className="rounded-2xl bg-cream p-3"><p className="text-[11px] uppercase tracking-wider text-muted">Wallet</p><p className="font-semibold">{inr(balance)}</p></div>
              <div className="rounded-2xl bg-lilac p-3"><p className="text-[11px] uppercase tracking-wider text-muted">Talk time</p><p className="font-semibold text-plum">{rate ? Math.floor(balance / rate) : 0} min</p></div>
            </div>
            {!a.is_online ? (
              <div className="rounded-2xl border border-line p-4 text-sm bg-pearl">
                <p className="font-medium mb-1">{a.name.split(' ')[0]} is offline right now</p>
                <p className="text-muted">Book a scheduled session and we’ll connect you at your chosen time.</p>
                <button className="btn btn-gold w-full mt-4" onClick={() => { setPending(null); nav(`/book/${a.slug}?mode=${mode}`); }}><CalendarDays className="h-4 w-4" /> Book a session</button>
              </div>
            ) : balance < min ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="font-medium text-amber-800">Minimum balance of {inr(min)} required</p>
                <p className="text-amber-700/80 mt-0.5">That covers the first 3 minutes. Recharge to begin instantly.</p>
                <button className="btn btn-rose w-full mt-4" onClick={() => { setPending(null); nav('/dashboard/wallet'); }}><Wallet className="h-4 w-4" /> Recharge wallet</button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted flex items-center gap-2"><Clock className="h-4 w-4 text-gold" /> Billed per started minute{mode !== 'chat' ? ' once the astrologer joins' : ''}. End anytime.</p>
                <label className="flex items-start gap-2.5 text-xs text-muted cursor-pointer"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D9678A]" /><span>I am 18+ and understand astrological guidance is for insight only and is not a substitute for medical, legal or financial advice. I agree to the <a href="/legal/terms" target="_blank" className="text-rose-deep underline">Terms</a> and <a href="/legal/refunds" target="_blank" className="text-rose-deep underline">Refund Policy</a>.</span></label>
                <button disabled={busy || !consent} onClick={confirm} className="btn btn-rose btn-lg w-full"><M.icon className="h-5 w-5" /> {busy ? 'Connecting…' : `Start ${M.label} now`}</button>
              </>
            )}
          </div>
        )}
      </Modal>
    </Ctx.Provider>
  );
}

export const useConsult = () => useContext(Ctx);
