import { useEffect, useState } from 'react';
import { Smartphone, Globe, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getPaymentConfig, startRecharge } from '../lib/payments';
import type { Provider } from '../lib/payments';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { inr } from '../lib/format';

export const bonusPct = (v: number) => (v >= 2000 ? 15 : v >= 1000 ? 10 : v >= 500 ? 5 : 0);

/** Provider buttons for a fixed amount. Wallet is credited only after server-side verification. */
export default function RechargeButtons({ amount, onDone, disabled, compact = false }: { amount: number; onDone?: (balance?: number) => void; disabled?: boolean; compact?: boolean }) {
  const [cfg, setCfg] = useState<{ razorpay: boolean; stripe: boolean } | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  const { toast } = useToast();
  const { refreshProfile } = useAuth();
  useEffect(() => { getPaymentConfig().then(setCfg); }, []);

  const pay = async (p: Provider) => {
    if (!amount || amount < 50) { toast('Minimum recharge is ₹50', 'error'); return; }
    setBusy(p);
    try {
      const r = await startRecharge(amount, p);
      if (r === 'redirected') toast('Complete payment in the Stripe tab — your wallet updates once Stripe confirms.', 'info');
      else if (r === 'dismissed') toast('Payment cancelled', 'info');
      else if (r.credited) { toast(`${inr(amount)} added${r.bonus ? ` + ${inr(r.bonus)} bonus` : ''} ✨`); await refreshProfile(); onDone?.(r.balance); }
      else toast('Payment received — we are waiting for confirmation from the bank.', 'info');
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(null); }
  };

  if (cfg && !cfg.razorpay && !cfg.stripe) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />Online payments are being activated. Please try again shortly or contact support.</div>;
  }
  return (
    <div className={`grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
      <button onClick={() => pay('razorpay')} disabled={disabled || !cfg?.razorpay || !!busy} className="btn btn-rose w-full" title={cfg && !cfg.razorpay ? 'Razorpay is not configured' : ''}>
        <Smartphone className="h-4 w-4" /> {busy === 'razorpay' ? 'Opening…' : `UPI / Cards · ${inr(amount)}`}
      </button>
      <button onClick={() => pay('stripe')} disabled={disabled || !cfg?.stripe || !!busy} className="btn btn-outline w-full" title={cfg && !cfg.stripe ? 'Stripe is not configured' : ''}>
        <Globe className="h-4 w-4" /> {busy === 'stripe' ? 'Redirecting…' : 'International card'}
      </button>
      <p className={`text-[11px] text-muted flex items-center gap-1 ${compact ? '' : 'sm:col-span-2'}`}><ShieldCheck className="h-3 w-3 text-gold" /> Secured by Razorpay (India) and Stripe (international). Card details never touch our servers.</p>
    </div>
  );
}
