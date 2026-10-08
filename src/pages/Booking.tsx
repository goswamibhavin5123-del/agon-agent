import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Sparkles, MessageCircle, Phone, Video, Ticket, Wallet, Smartphone, CreditCard, CheckCircle2, CalendarPlus, X, Clock } from 'lucide-react';
import { api, useApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { PageLoader, ErrorState, Verified, Spinner } from '../components/ui';
import { inr, slotsFor, label12, fmtDay, fmtDateTime, rateFor, MODES } from '../lib/format';
import type { Mode } from '../lib/format';
import { SERVICE_ICONS } from './Home';
import { StarField } from '../components/Celestial';
import RechargeButtons from '../components/Recharge';

const STEPS = ['Service', 'Mode', 'Date', 'Time', 'Duration', 'Payment'];
const DURATIONS = [15, 30, 45, 60];

function toDateAt(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

export default function Booking() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const astro = useApi<any>(`/api/astrologers?slug=${slug}`, [slug]);
  const services = useApi<any[]>('/api/content?type=services');
  const coupons = useApi<any[]>('/api/content?type=coupons');

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<number | null>(params.get('service') ? Number(params.get('service')) : null);
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'chat');
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [taken, setTaken] = useState<{ scheduled_at: string; duration: number }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponErr, setCouponErr] = useState('');
  const [applying, setApplying] = useState(false);
  const [notes, setNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<any>(null);

  const a = astro.data;
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; }), []);

  useEffect(() => {
    if (!date || !a) return;
    const from = new Date(date); const to = new Date(date); to.setDate(to.getDate() + 1);
    setLoadingSlots(true);
    api(`/api/bookings?astrologer_id=${a.id}&from=${from.toISOString()}&to=${to.toISOString()}`).then(setTaken).catch(() => setTaken([])).finally(() => setLoadingSlots(false));
  }, [date, a]);

  const overlaps = (start: Date, dur: number) => taken.some((b) => { const bs = new Date(b.scheduled_at).getTime(); const be = bs + b.duration * 60000; const s = start.getTime(); return s < be && bs < s + dur * 60000; });
  const dayEnd = (d: Date) => { const av = a?.availability?.[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()]]; return av?.on ? toDateAt(d, av.end) : null; };
  const slots = useMemo(() => (date && a ? slotsFor(a.availability, date).map((t) => { const at = toDateAt(date, t); const past = at.getTime() < Date.now() + 30 * 60000; return { t, disabled: past || overlaps(at, 15) }; }) : []), [date, a, taken]);

  if (astro.loading) return <PageLoader label="Preparing your booking…" />;
  if (astro.error || !a) return <div className="max-w-3xl mx-auto px-4 py-16"><ErrorState message={astro.error || 'Astrologer not found'} onRetry={() => astro.reload()} /></div>;

  const rate = rateFor(a, mode);
  const subtotal = rate * duration;
  const discount = applied ? Math.min(applied.discount, subtotal) : 0;
  const total = Math.round((subtotal - discount) * 100) / 100;
  const balance = Number(profile?.wallet_balance || 0);
  const service = (services.data || []).find((s) => s.id === serviceId);
  const startAt = date && time ? toDateAt(date, time) : null;
  const durationOk = (d: number) => { if (!startAt || !date) return true; const end = dayEnd(date); if (end && startAt.getTime() + d * 60000 > end.getTime()) return false; return !overlaps(startAt, d); };
  const canNext = [!!serviceId, !!mode, !!date, !!time, durationOk(duration), true][step];

  const applyCoupon = async (c?: string) => {
    const cc = (c ?? code).trim();
    if (!cc) { setCouponErr('Enter a coupon code'); return; }
    setApplying(true); setCouponErr('');
    try {
      const r = await api(`/api/content?type=coupon_check&code=${encodeURIComponent(cc)}&amount=${subtotal}`);
      setApplied({ code: r.coupon.code, discount: r.discount }); setCode(r.coupon.code);
      toast(`Coupon applied — you save ${inr(r.discount)}`);
    } catch (e: any) { setApplied(null); setCouponErr(e.message); } finally { setApplying(false); }
  };

  const pay = async () => {
    if (!startAt) return;
    if (balance < total) { toast('Insufficient wallet balance. Please add money first.', 'error'); return; }
    setPaying(true);
    try {
      const b = await api('/api/bookings', { method: 'POST', body: { astrologer_id: a.id, service_id: serviceId, mode, scheduled_at: startAt.toISOString(), duration, coupon_code: applied?.code, notes } });
      setDone(b);
      refreshProfile();
    } catch (e: any) { toast(e.message, 'error'); } finally { setPaying(false); }
  };

  const ics = () => {
    if (!done) return;
    const s = new Date(done.scheduled_at); const e = new Date(s.getTime() + done.duration * 60000);
    const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const body = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${done.reference}@AstroRahu\nDTSTART:${f(s)}\nDTEND:${f(e)}\nSUMMARY:Astro Rahu · ${MODES[mode].label} with ${a.name}\nDESCRIPTION:Booking ${done.reference}\nEND:VEVENT\nEND:VCALENDAR`;
    const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    const link = document.createElement('a'); link.href = url; link.download = 'astro-venus-session.ics'; link.click(); URL.revokeObjectURL(url);
  };

  if (done) {
    return (
      <div className="relative min-h-[80vh] flex items-center justify-center px-4 py-16 bg-celestial overflow-hidden">
        <StarField count={50} seed={71} />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative card gold-border p-8 sm:p-10 max-w-lg w-full text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="mx-auto h-20 w-20 rounded-full bg-gold-grad flex items-center justify-center shadow-lux"><Check className="h-10 w-10 text-plum-deep" strokeWidth={3} /></motion.div>
          <h1 className="font-display text-3xl text-plum mt-6">Booking confirmed</h1>
          <p className="text-muted mt-2">Your session is written in the stars.</p>
          <div className="mt-6 rounded-2xl bg-cream/60 p-5 text-left space-y-2.5 text-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-line"><img src={a.photo} className="h-12 w-12 rounded-xl object-cover" alt="" /><div><p className="font-medium">{a.name}</p><p className="text-xs text-muted">{MODES[mode].label} · {service?.name}</p></div></div>
            <div className="flex justify-between"><span className="text-muted">When</span><b>{fmtDateTime(done.scheduled_at)}</b></div>
            <div className="flex justify-between"><span className="text-muted">Duration</span><b>{done.duration} min</b></div>
            <div className="flex justify-between"><span className="text-muted">Paid</span><b className="text-rose-deep">{inr(done.total)}</b></div>
            <div className="flex justify-between"><span className="text-muted">Reference</span><b className="font-mono text-xs">{done.reference}</b></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-6">
            <button onClick={ics} className="btn btn-outline"><CalendarPlus className="h-4 w-4" /> Add to calendar</button>
            <Link to="/dashboard/bookings" className="btn btn-rose">My bookings</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const Summary = (
    <div className="card gold-border p-5">
      <div className="flex items-center gap-3"><img src={a.photo} alt="" className="h-14 w-14 rounded-2xl object-cover" /><div className="min-w-0"><p className="font-serif text-lg font-semibold flex items-center gap-1">{a.name}{a.verified && <Verified />}</p><p className="text-xs text-muted truncate">{a.title}</p></div></div>
      <div className="mt-4 space-y-2 text-sm">
        {[['Service', service?.name], ['Mode', `${MODES[mode].label} · ${inr(rate)}/min`], ['Date', date ? fmtDay(date) : null], ['Time', time ? label12(time) : null], ['Duration', `${duration} min`]].map(([l, v]) => (
          <div key={l as string} className="flex justify-between gap-3"><span className="text-muted">{l}</span><span className={`text-right ${v ? 'font-medium' : 'text-muted/60'}`}>{v || '—'}</span></div>
        ))}
        <div className="pt-3 mt-3 border-t border-line space-y-1.5">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{inr(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon {applied?.code}</span><span>−{inr(discount)}</span></div>}
          <div className="flex justify-between text-base font-semibold"><span>Total</span><span className="text-rose-deep">{inr(total)}</span></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-32 lg:pb-12">
      <Link to={`/astrologer/${a.slug}`} className="btn btn-ghost btn-sm -ml-2"><ChevronLeft className="h-4 w-4" /> {a.name}</Link>
      <h1 className="font-display text-3xl sm:text-4xl text-plum mt-3">Book a <span className="font-serif italic font-medium text-rose-grad">session</span></h1>

      <div className="mt-6 flex items-center gap-1 overflow-x-auto scrollbar-none pb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <button onClick={() => i < step && setStep(i)} disabled={i > step} className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm transition ${i === step ? 'bg-plum text-white' : i < step ? 'bg-blush text-rose-deep' : 'text-muted'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${i === step ? 'bg-gold-grad text-plum-deep' : i < step ? 'bg-rose text-white' : 'bg-cream'}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>{s}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-line" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 mt-4">
        <div className="card p-5 sm:p-8 min-h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              {step === 0 && (
                <>
                  <h2 className="font-serif text-2xl font-semibold text-plum">What would you like guidance on?</h2>
                  <div className="grid sm:grid-cols-2 gap-3 mt-5">
                    {services.loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-20" />) : (services.data || []).map((s) => {
                      const I = SERVICE_ICONS[s.icon] || Sparkles;
                      return (
                        <button key={s.id} onClick={() => setServiceId(s.id)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${serviceId === s.id ? 'border-rose bg-blush/50 shadow-rose' : 'border-line hover:border-gold-light'}`}>
                          <span className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${serviceId === s.id ? 'bg-rose-grad text-white' : 'bg-cream text-gold-deep'}`}><I className="h-5 w-5" /></span>
                          <span className="min-w-0"><span className="block font-medium">{s.name}</span><span className="block text-xs text-muted truncate">{s.description}</span></span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <h2 className="font-serif text-2xl font-semibold text-plum">How would you like to connect?</h2>
                  <div className="grid sm:grid-cols-3 gap-3 mt-5">
                    {([['chat', MessageCircle, 'Private text chat with voice notes'], ['audio', Phone, 'Crystal-clear voice call'], ['video', Video, 'Face-to-face HD video']] as const).map(([k, I, d]) => (
                      <button key={k} onClick={() => setMode(k)} className={`rounded-2xl border p-5 text-center transition ${mode === k ? 'border-rose bg-blush/50 shadow-rose' : 'border-line hover:border-gold-light'}`}>
                        <span className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center ${mode === k ? 'bg-rose-grad text-white' : 'bg-cream text-gold-deep'}`}><I className="h-6 w-6" /></span>
                        <p className="font-medium mt-3">{MODES[k].label}</p>
                        <p className="text-xs text-muted mt-1">{d}</p>
                        <p className="font-semibold text-rose-deep mt-2">{inr(rateFor(a, k))}/min</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <h2 className="font-serif text-2xl font-semibold text-plum">Choose a date</h2>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-5">
                    {days.map((d) => {
                      const avail = slotsFor(a.availability, d).length > 0;
                      const sel = date?.toDateString() === d.toDateString();
                      return (
                        <button key={d.toISOString()} disabled={!avail} onClick={() => { setDate(d); setTime(null); }} className={`rounded-2xl border py-3 text-center transition ${sel ? 'bg-plum text-white border-plum shadow-soft' : avail ? 'border-line hover:border-gold' : 'opacity-35 cursor-not-allowed border-line'}`}>
                          <span className="block text-[10px] uppercase tracking-wider opacity-70">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                          <span className="block font-serif text-2xl font-semibold">{d.getDate()}</span>
                          <span className="block text-[10px] opacity-70">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted mt-4">Greyed-out days are outside {a.name.split(' ')[0]}’s schedule.</p>
                </>
              )}
              {step === 3 && (
                <>
                  <h2 className="font-serif text-2xl font-semibold text-plum">Pick a time</h2>
                  <p className="text-sm text-muted mt-1">{date && fmtDay(date)} · shown in your local time</p>
                  {loadingSlots ? <div className="py-12 flex justify-center"><Spinner className="h-6 w-6" /></div> : slots.length === 0 ? <p className="text-muted mt-6">No slots on this day.</p> : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-5">
                      {slots.map((s) => <button key={s.t} disabled={s.disabled} onClick={() => setTime(s.t)} className={`rounded-xl border py-2.5 text-sm transition ${time === s.t ? 'bg-rose-grad text-white border-transparent shadow-rose' : s.disabled ? 'opacity-35 line-through cursor-not-allowed border-line' : 'border-line hover:border-rose'}`}>{label12(s.t)}</button>)}
                    </div>
                  )}
                  {slots.length > 0 && slots.every((s) => s.disabled) && <p className="text-sm text-amber-700 mt-4">All slots are taken or have passed. Please choose another date.</p>}
                </>
              )}
              {step === 4 && (
                <>
                  <h2 className="font-serif text-2xl font-semibold text-plum">How long do you need?</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    {DURATIONS.map((d) => {
                      const ok = durationOk(d);
                      return (
                        <button key={d} disabled={!ok} onClick={() => setDuration(d)} className={`rounded-2xl border p-4 text-center transition ${duration === d && ok ? 'border-rose bg-blush/50 shadow-rose' : ok ? 'border-line hover:border-gold-light' : 'opacity-35 cursor-not-allowed border-line'}`}>
                          <Clock className="h-5 w-5 mx-auto text-gold" />
                          <p className="font-serif text-2xl font-semibold mt-1">{d}<span className="text-sm font-sans font-normal text-muted"> min</span></p>
                          <p className="text-sm text-rose-deep font-medium">{inr(rate * d)}</p>
                          {!ok && <p className="text-[10px] text-muted mt-1">Unavailable</p>}
                        </button>
                      );
                    })}
                  </div>
                  <label className="block mt-6"><span className="label">Notes for the astrologer (optional)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} className="input" placeholder="Share your question and birth details to make the most of your session" /></label>
                </>
              )}
              {step === 5 && (
                <>
                  <h2 className="font-serif text-2xl font-semibold text-plum">Review & pay</h2>
                  <div className="mt-5">
                    <p className="label">Coupon</p>
                    {applied ? (
                      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"><span className="flex items-center gap-2 text-emerald-800 text-sm"><Ticket className="h-4 w-4" /><b>{applied.code}</b> applied · saving {inr(discount)}</span><button onClick={() => { setApplied(null); setCode(''); }} className="text-emerald-800" aria-label="Remove coupon"><X className="h-4 w-4" /></button></div>
                    ) : (
                      <>
                        <div className="flex gap-2"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" className={`input uppercase ${couponErr ? 'input-error' : ''}`} /><button onClick={() => applyCoupon()} disabled={applying} className="btn btn-plum">{applying ? '…' : 'Apply'}</button></div>
                        {couponErr && <p className="text-xs text-danger mt-1">{couponErr}</p>}
                        {(coupons.data || []).length > 0 && <div className="flex flex-wrap gap-2 mt-3">{(coupons.data || []).map((c) => <button key={c.id} onClick={() => applyCoupon(c.code)} className="chip chip-gold hover:shadow-lux" title={c.description}><Ticket className="h-3 w-3" />{c.code} · {c.discount_type === 'percent' ? `${c.value}% off` : `${inr(c.value)} off`}</button>)}</div>}
                      </>
                    )}
                  </div>
                  <div className="mt-6">
                    <p className="label">Payment</p>
                    <div className="flex items-center gap-3 rounded-2xl border border-rose bg-blush/40 p-4">
                      <span className="h-10 w-10 rounded-xl flex items-center justify-center bg-rose-grad text-white"><Wallet className="h-5 w-5" /></span>
                      <span className="flex-1"><span className="block font-medium">Astro Rahu Wallet</span><span className={`block text-xs ${balance < total ? 'text-danger' : 'text-muted'}`}>Balance {inr(balance)}{balance < total ? ` · ${inr(total - balance)} short` : ''}</span></span>
                    </div>
                    {balance < total && (
                      <div className="mt-3 rounded-2xl border border-line p-4">
                        <p className="text-sm mb-3">Add <b>{inr(Math.max(50, Math.ceil(total - balance)))}</b> to your wallet to complete this booking.</p>
                        <RechargeButtons amount={Math.max(50, Math.ceil(total - balance))} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="hidden lg:flex justify-between mt-8 pt-6 border-t border-line">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn btn-ghost"><ChevronLeft className="h-4 w-4" /> Back</button>
            {step < 5 ? <button onClick={() => setStep(step + 1)} disabled={!canNext} className="btn btn-rose">Continue <ChevronRight className="h-4 w-4" /></button> : <button onClick={pay} disabled={paying} className="btn btn-gold btn-lg">{paying ? 'Processing…' : <><CheckCircle2 className="h-5 w-5" /> Pay {inr(total)}</>}</button>}
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 h-fit order-first lg:order-none">{Summary}</aside>
      </div>

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-pearl/95 backdrop-blur border-t border-line p-3 flex gap-2 safe-bottom">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn btn-outline !px-4"><ChevronLeft className="h-4 w-4" /></button>
        {step < 5 ? <button onClick={() => setStep(step + 1)} disabled={!canNext} className="btn btn-rose flex-1">Continue · {STEPS[step + 1]}</button> : <button onClick={pay} disabled={paying} className="btn btn-gold flex-1">{paying ? 'Processing…' : `Pay ${inr(total)}`}</button>}
      </div>
    </div>
  );
}
