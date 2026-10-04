import { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { House, Users, MessageCircle, Phone, CalendarDays, Sun, Orbit, Wallet, Heart, Bell, User, LifeBuoy, ArrowRight, Plus, ArrowDownLeft, ArrowUpRight, RotateCcw, Gift, Clock, X, CalendarClock, Video, ChevronDown, Send, Sparkles, LogOut, Star, CreditCard, Smartphone } from 'lucide-react';
import PanelShell from '../../components/PanelShell';
import { useApi, api, fileToBase64 } from '../../lib/api';
import { verifyStripeReturn } from '../../lib/payments';
import RechargeButtons from '../../components/Recharge';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConsult } from '../../contexts/ConsultContext';
import { EmptyState, ErrorState, Skeleton, Badge, Tabs, Modal, Field, Stars, Verified, Avatar } from '../../components/ui';
import AstrologerCard, { AstrologerCardSkeleton } from '../../components/AstrologerCard';
import Astrologers from '../Astrologers';
import Horoscope from '../Horoscope';
import Kundli from '../Kundli';
import { inr, fmtDateTime, fmtDate, timeAgo, fmtDuration, MODES, slotsFor, label12, fmtDay } from '../../lib/format';
import { SIGNS, g, signFromDate, signByKey } from '../../lib/zodiac';
import { StarField } from '../../components/Celestial';

export default function CustomerDashboard() {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const items = [
    { to: '/dashboard', label: 'Home', icon: House, end: true },
    { to: '/dashboard/astrologers', label: 'Astrologers', icon: Users },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
    { to: '/dashboard/calls', label: 'Calls', icon: Phone },
    { to: '/dashboard/bookings', label: 'Bookings', icon: CalendarDays },
    { to: '/dashboard/horoscope', label: 'Horoscope', icon: Sun },
    { to: '/dashboard/kundli', label: 'Kundli', icon: Orbit },
    { to: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
    { to: '/dashboard/favorites', label: 'Favorites', icon: Heart },
    { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    { to: '/dashboard/profile', label: 'Profile', icon: User },
    { to: '/dashboard/support', label: 'Support', icon: LifeBuoy },
  ];
  return (
    <PanelShell items={items} title="My Sanctuary" subtitle={`Namaste, ${profile?.full_name?.split(' ')[0] || 'Seeker'}`}
      topRight={<Link to="/dashboard/wallet" className="hidden sm:flex items-center gap-2 rounded-full gold-border px-3.5 py-2 text-sm font-medium text-gold-deep"><Wallet className="h-4 w-4" />{inr(profile?.wallet_balance || 0)}</Link>}
      footer={<button onClick={async () => { await signOut(); nav('/'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-danger hover:bg-rose-50"><LogOut className="h-4 w-4" /> Sign out</button>}>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="astrologers" element={<Astrologers embedded />} />
        <Route path="chat" element={<History modes="chat" />} />
        <Route path="calls" element={<History modes="audio,video" />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="horoscope" element={<Horoscope embedded defaultSign={profile?.zodiac || signFromDate(profile?.dob) || 'aries'} />} />
        <Route path="kundli" element={<Kundli embedded />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="support" element={<Support />} />
      </Routes>
    </PanelShell>
  );
}

function Overview() {
  const { data, loading, error, reload } = useApi<any>('/api/me?section=summary');
  const { profile } = useAuth();
  const signKey = profile?.zodiac || signFromDate(profile?.dob);
  const horo = useApi<any[]>(signKey ? `/api/content?type=horoscopes&sign=${signKey}&period=daily` : null, [signKey]);
  const sign = signByKey(signKey);
  if (error) return <ErrorState message={error} onRetry={() => reload()} />;
  const h = horo.data?.[0];
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-plum-grad p-6 sm:p-8 text-white">
          <StarField count={30} seed={91} color="#E8CD8A" />
          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-gold-light/80">Wallet balance</p>
              <p className="font-display text-5xl text-gold-grad mt-2">{loading ? '—' : inr(data.profile.wallet_balance)}</p>
              <p className="text-white/60 text-sm mt-2">Recharge ₹1,000+ and get 10% bonus credit</p>
            </div>
            <div className="flex gap-2"><Link to="/dashboard/wallet" className="btn btn-gold"><Plus className="h-4 w-4" /> Add money</Link></div>
          </div>
          <div className="relative grid grid-cols-3 gap-2 mt-8">
            {[{ to: '/dashboard/astrologers', i: MessageCircle, l: 'Chat now' }, { to: '/dashboard/bookings', i: CalendarDays, l: 'Bookings' }, { to: '/dashboard/kundli', i: Orbit, l: 'Kundli' }].map((x) => (
              <Link key={x.l} to={x.to} className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 p-3 text-center text-sm transition"><x.i className="h-5 w-5 mx-auto text-gold-light mb-1" />{x.l}</Link>
            ))}
          </div>
        </div>
        <div className="card gold-border p-6 relative overflow-hidden">
          {sign ? (
            <>
              <div className="flex items-center gap-4"><span className="h-14 w-14 rounded-2xl bg-plum-grad flex items-center justify-center text-3xl text-gold-light font-serif">{g(sign.glyph)}</span><div><p className="text-[11px] uppercase tracking-[0.25em] text-gold-deep">Your day · {sign.name}</p><p className="font-serif text-xl font-semibold text-plum">Today’s horoscope</p></div></div>
              {horo.loading ? <Skeleton className="h-20 mt-4" /> : <p className="text-sm text-ink/80 leading-relaxed mt-4 line-clamp-4">{h?.overview}</p>}
              {h && <div className="flex gap-2 mt-4 text-xs"><span className="chip chip-gold">Lucky {h.lucky_number}</span><span className="chip chip-rose">{h.lucky_color}</span></div>}
              <Link to="/dashboard/horoscope" className="text-sm text-rose-deep font-medium mt-4 inline-flex items-center gap-1">Read full forecast <ArrowRight className="h-4 w-4" /></Link>
            </>
          ) : (
            <div className="text-center py-4"><Sun className="h-10 w-10 text-gold mx-auto" /><p className="font-serif text-xl font-semibold text-plum mt-3">Personalise your horoscope</p><p className="text-sm text-muted mt-1">Add your date of birth to see your daily reading here.</p><Link to="/dashboard/profile" className="btn btn-rose btn-sm mt-4">Complete profile</Link></div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="font-serif text-xl font-semibold text-plum">Upcoming bookings</h2><Link to="/dashboard/bookings" className="text-xs text-rose-deep font-medium">View all</Link></div>
          {loading ? <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : data.upcoming.length === 0 ? (
            <div className="text-center py-6"><CalendarClock className="h-8 w-8 text-gold mx-auto" /><p className="text-sm text-muted mt-2">No sessions scheduled.</p><Link to="/dashboard/astrologers" className="btn btn-outline btn-sm mt-3">Book a session</Link></div>
          ) : data.upcoming.map((b: any) => {
            const M = MODES[b.mode as keyof typeof MODES];
            return (
              <div key={b.id} className="flex items-center gap-3 py-3 border-b border-line last:border-0">
                <img src={b.astrologers?.photo} className="h-12 w-12 rounded-xl object-cover" alt="" />
                <div className="flex-1 min-w-0"><p className="font-medium truncate">{b.astrologers?.name}</p><p className="text-xs text-muted flex items-center gap-1"><M.icon className="h-3 w-3" />{M.label} · {b.duration} min</p></div>
                <div className="text-right"><p className="text-sm font-medium text-plum">{fmtDay(b.scheduled_at)}</p><p className="text-xs text-muted">{new Date(b.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p></div>
              </div>
            );
          })}
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="font-serif text-xl font-semibold text-plum">Consultation history</h2><Link to="/dashboard/chat" className="text-xs text-rose-deep font-medium">View all</Link></div>
          {loading ? <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : data.consultations.length === 0 ? (
            <div className="text-center py-6"><MessageCircle className="h-8 w-8 text-gold mx-auto" /><p className="text-sm text-muted mt-2">Your consultations will appear here.</p></div>
          ) : data.consultations.slice(0, 5).map((c: any) => {
            const M = MODES[c.mode as keyof typeof MODES];
            return (
              <Link key={c.id} to={`/consult/${c.id}`} className="flex items-center gap-3 py-3 border-b border-line last:border-0 hover:bg-cream/40 -mx-2 px-2 rounded-xl">
                <img src={c.astrologers?.photo} className="h-10 w-10 rounded-full object-cover" alt="" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.astrologers?.name}</p><p className="text-xs text-muted flex items-center gap-1"><M.icon className="h-3 w-3" />{M.label} · {timeAgo(c.created_at)}</p></div>
                {c.status === 'active' ? <Badge status="active">Live</Badge> : <span className="text-sm font-medium">{c.prepaid ? 'Prepaid' : inr(c.amount)}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4"><h2 className="font-serif text-2xl font-semibold text-plum">Recommended for you</h2><Link to="/dashboard/astrologers" className="text-sm text-rose-deep font-medium">Explore all</Link></div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{loading ? Array.from({ length: 3 }).map((_, i) => <AstrologerCardSkeleton key={i} />) : data.recommendations.map((a: any, i: number) => <AstrologerCard key={a.id} a={a} index={i} />)}</div>
      </div>
    </div>
  );
}

function History({ modes }: { modes: string }) {
  const { data, loading, error, reload } = useApi<any[]>(`/api/consultations?mode=${modes}`, [modes]);
  const [filter, setFilter] = useState('all');
  const list = (data || []).filter((c) => filter === 'all' || c.mode === filter || c.status === filter);
  const isChat = modes === 'chat';
  const total = (data || []).reduce((s, c) => s + Number(c.amount || 0), 0);
  const mins = (data || []).reduce((s, c) => s + Number(c.minutes || 0), 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-[10px] uppercase tracking-wider text-muted">Sessions</p><p className="font-serif text-2xl font-semibold">{data?.length ?? '—'}</p></div>
        <div className="card p-4"><p className="text-[10px] uppercase tracking-wider text-muted">Minutes</p><p className="font-serif text-2xl font-semibold">{mins}</p></div>
        <div className="card p-4"><p className="text-[10px] uppercase tracking-wider text-muted">Spent</p><p className="font-serif text-2xl font-semibold">{inr(total)}</p></div>
      </div>
      {!isChat && <Tabs value={filter} onChange={setFilter} tabs={[{ key: 'all', label: 'All' }, { key: 'audio', label: 'Audio' }, { key: 'video', label: 'Video' }]} className="w-fit" />}
      {error ? <ErrorState message={error} onRetry={() => reload()} /> : loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div> : list.length === 0 ? (
        <div className="card"><EmptyState icon={isChat ? MessageCircle : Phone} title={isChat ? 'No chats yet' : 'No calls yet'} text="Start a consultation with an online astrologer." action={<Link to="/dashboard/astrologers" className="btn btn-rose btn-sm">Find an astrologer</Link>} /></div>
      ) : (
        <div className="card divide-y divide-line">
          {list.map((c) => {
            const M = MODES[c.mode as keyof typeof MODES];
            return (
              <div key={c.id} className="flex items-center gap-4 p-4">
                <img src={c.astrologers?.photo} className="h-12 w-12 rounded-2xl object-cover" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.astrologers?.name}</p>
                  <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap"><M.icon className="h-3 w-3" />{M.label} · {fmtDateTime(c.created_at)} {c.duration_sec ? `· ${fmtDuration(c.duration_sec)}` : ''}</p>
                  {c.rating && <Stars value={c.rating} size={11} className="mt-1" />}
                </div>
                <div className="text-right space-y-1">
                  {c.status === 'active' ? <Badge status="active">Live</Badge> : <p className="text-sm font-semibold">{c.prepaid ? 'Prepaid' : inr(c.amount)}</p>}
                  <Link to={`/consult/${c.id}`} className="text-xs text-rose-deep font-medium block">{c.status === 'active' ? 'Rejoin →' : isChat ? 'Transcript →' : 'Details →'}</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Bookings() {
  const { data, loading, error, reload } = useApi<any[]>('/api/bookings');
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const [cancel, setCancel] = useState<any>(null);
  const [resched, setResched] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [rDate, setRDate] = useState<Date | null>(null);
  const [rTime, setRTime] = useState<string | null>(null);
  const list = (data || []).filter((b) => (tab === 'upcoming' ? b.status === 'upcoming' : tab === 'completed' ? b.status === 'completed' : ['cancelled', 'refunded'].includes(b.status)));
  const counts = { upcoming: (data || []).filter((b) => b.status === 'upcoming').length, completed: (data || []).filter((b) => b.status === 'completed').length, cancelled: (data || []).filter((b) => ['cancelled', 'refunded'].includes(b.status)).length };
  const refundPct = (b: any) => { const h = (new Date(b.scheduled_at).getTime() - Date.now()) / 3600000; return h >= 2 ? 100 : h > 0 ? 50 : 0; };
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; }), []);

  const doCancel = async () => {
    setBusy(true);
    try { const r = await api('/api/bookings', { method: 'PUT', body: { id: cancel.id, action: 'cancel' } }); toast(r.refund_amount ? `Cancelled · ${inr(r.refund_amount)} refunded to wallet` : 'Booking cancelled', 'info'); setCancel(null); reload(true); refreshProfile(); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const doResched = async () => {
    if (!rDate || !rTime) return;
    const [h, m] = rTime.split(':').map(Number); const d = new Date(rDate); d.setHours(h, m, 0, 0);
    setBusy(true);
    try { await api('/api/bookings', { method: 'PUT', body: { id: resched.id, action: 'reschedule', scheduled_at: d.toISOString() } }); toast('Session rescheduled'); setResched(null); reload(true); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const join = async (b: any) => {
    try { const c = await api('/api/consultations', { method: 'POST', body: { action: 'start', astrologer_id: b.astrologer_id, mode: b.mode, booking_id: b.id } }); nav(`/consult/${c.id}`); } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'upcoming', label: 'Upcoming', count: counts.upcoming }, { key: 'completed', label: 'Completed', count: counts.completed }, { key: 'cancelled', label: 'Cancelled', count: counts.cancelled }]} className="w-fit" />
        <Link to="/dashboard/astrologers" className="btn btn-rose btn-sm w-fit"><Plus className="h-4 w-4" /> New booking</Link>
      </div>
      {error ? <ErrorState message={error} onRetry={() => reload()} /> : loading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div> : list.length === 0 ? (
        <div className="card"><EmptyState icon={CalendarDays} title={`No ${tab} bookings`} text="Scheduled sessions let you meet your chosen astrologer at a time that suits you." action={<Link to="/dashboard/astrologers" className="btn btn-rose btn-sm">Browse astrologers</Link>} /></div>
      ) : (
        <div className="grid gap-4">
          {list.map((b) => {
            const M = MODES[b.mode as keyof typeof MODES];
            const startMs = new Date(b.scheduled_at).getTime();
            const canJoin = b.status === 'upcoming' && Date.now() >= startMs - 15 * 60000;
            return (
              <motion.div key={b.id} layout className="card p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="text-center rounded-2xl bg-cream/70 px-3 py-2 w-16 shrink-0"><p className="text-[10px] uppercase text-muted">{new Date(b.scheduled_at).toLocaleDateString('en-IN', { month: 'short' })}</p><p className="font-serif text-2xl font-semibold text-plum leading-none">{new Date(b.scheduled_at).getDate()}</p><p className="text-[10px] text-muted">{new Date(b.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short' })}</p></div>
                  <img src={b.astrologers?.photo} className="h-12 w-12 rounded-2xl object-cover hidden sm:block" alt="" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{b.astrologers?.name}</p>
                    <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap"><M.icon className="h-3 w-3" />{M.label} · {b.services?.name || 'Consultation'} · {b.duration} min</p>
                    <p className="text-xs text-muted mt-0.5"><Clock className="inline h-3 w-3" /> {new Date(b.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · Ref {b.reference}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-3">
                  <div className="text-right"><p className="font-semibold">{inr(b.total)}</p>{b.refund_amount > 0 ? <p className="text-xs text-emerald-700">Refunded {inr(b.refund_amount)}</p> : <Badge status={b.status} />}</div>
                  {b.status === 'upcoming' && (
                    <div className="flex gap-1.5">
                      {canJoin && <button onClick={() => join(b)} className="btn btn-rose btn-sm">Join</button>}
                      <button onClick={() => { setResched(b); setRDate(null); setRTime(null); }} className="btn btn-outline btn-sm" title="Reschedule"><CalendarClock className="h-4 w-4" /><span className="hidden sm:inline">Reschedule</span></button>
                      <button onClick={() => setCancel(b)} className="btn btn-ghost btn-sm !text-danger" title="Cancel"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                  {b.status === 'completed' && <Link to={`/book/${b.astrologers?.slug}`} className="btn btn-outline btn-sm"><RotateCcw className="h-4 w-4" /> Book again</Link>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={!!cancel} onClose={() => setCancel(null)} title="Cancel booking?" size="sm">
        {cancel && (
          <div>
            <p className="text-sm text-muted">Session with <b className="text-ink">{cancel.astrologers?.name}</b> on {fmtDateTime(cancel.scheduled_at)}.</p>
            <div className="rounded-2xl bg-cream/70 p-4 mt-4 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-muted">Paid</span><b>{inr(cancel.total)}</b></div>
              <div className="flex justify-between"><span className="text-muted">Refund ({refundPct(cancel)}%)</span><b className="text-emerald-700">{inr((cancel.total * refundPct(cancel)) / 100)}</b></div>
            </div>
            <p className="text-xs text-muted mt-3">Full refund if cancelled 2+ hours before; 50% within 2 hours. Refunds go to your wallet instantly.</p>
            <div className="grid grid-cols-2 gap-2 mt-5"><button onClick={() => setCancel(null)} className="btn btn-outline">Keep</button><button onClick={doCancel} disabled={busy} className="btn btn-danger">{busy ? '…' : 'Cancel booking'}</button></div>
          </div>
        )}
      </Modal>
      <Modal open={!!resched} onClose={() => setResched(null)} title="Reschedule session" size="lg">
        {resched && (
          <div>
            <p className="label">New date</p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">{days.map((d) => { const ok = slotsFor(resched.astrologers?.availability, d).length > 0; const sel = rDate?.toDateString() === d.toDateString(); return <button key={d.toISOString()} disabled={!ok} onClick={() => { setRDate(d); setRTime(null); }} className={`rounded-xl border py-2 text-center text-sm ${sel ? 'bg-plum text-white border-plum' : ok ? 'border-line hover:border-gold' : 'opacity-30 border-line'}`}><span className="block text-[10px] opacity-70">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>{d.getDate()}</button>; })}</div>
            {rDate && (<><p className="label mt-5">New time</p><div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{slotsFor(resched.astrologers?.availability, rDate).map((t) => { const [h, m] = t.split(':').map(Number); const d = new Date(rDate); d.setHours(h, m); const past = d.getTime() < Date.now() + 30 * 60000; return <button key={t} disabled={past} onClick={() => setRTime(t)} className={`rounded-xl border py-2 text-sm ${rTime === t ? 'bg-rose-grad text-white border-transparent' : past ? 'opacity-30 border-line' : 'border-line hover:border-rose'}`}>{label12(t)}</button>; })}</div></>)}
            <button onClick={doResched} disabled={!rDate || !rTime || busy} className="btn btn-rose w-full mt-6">{busy ? 'Saving…' : 'Confirm new time'}</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function WalletPage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const tx = useApi<any[]>('/api/me?section=transactions');
  const [amount, setAmount] = useState(500);
  const [custom, setCustom] = useState('');
  const [filter, setFilter] = useState('all');
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const pid = params.get('stripe_payment');
    const cancelled = params.get('stripe_cancelled');
    if (cancelled) { toast('Stripe payment cancelled', 'info'); setParams({}, { replace: true }); return; }
    if (!pid) return;
    setParams({}, { replace: true });
    verifyStripeReturn(Number(pid)).then((r: any) => {
      if (r.status === 'paid') { toast(r.credited ? `${inr(r.amount)} added${Number(r.bonus) ? ` + ${inr(r.bonus)} bonus` : ''} ✨` : 'Payment already credited'); refreshProfile(); tx.reload(true); }
      else toast('Payment is still being confirmed by Stripe. Your wallet will update automatically.', 'info');
    }).catch((e: any) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const packs = [100, 200, 500, 1000, 2000, 5000];
  const bonus = (v: number) => (v >= 2000 ? 15 : v >= 1000 ? 10 : v >= 500 ? 5 : 0);
  const value = custom ? Number(custom) : amount;
  const err = custom && (Number(custom) < 50 || Number(custom) > 100000) ? 'Enter between ₹50 and ₹1,00,000' : '';
  const list = (tx.data || []).filter((t) => filter === 'all' || (filter === 'in' ? ['credit', 'refund'].includes(t.type) : ['debit', 'payment'].includes(t.type)));
  return (
    <div className="grid xl:grid-cols-[1fr_1.1fr] gap-6">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-rosegold-grad p-7 text-white shadow-rose">
          <StarField count={20} seed={13} color="#fff" />
          <p className="relative text-[11px] uppercase tracking-[0.3em] text-white/80">Available balance</p>
          <p className="relative font-display text-5xl mt-2">{inr(profile?.wallet_balance || 0, 2)}</p>
          <p className="relative text-white/80 text-sm mt-2">Used for per-minute consultations and bookings</p>
        </div>
        <div className="card p-6">
          <h2 className="font-serif text-xl font-semibold text-plum">Add money</h2>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {packs.map((p) => (
              <button key={p} onClick={() => { setAmount(p); setCustom(''); }} className={`relative rounded-2xl border p-3 text-center transition ${!custom && amount === p ? 'border-rose bg-blush/50 shadow-rose' : 'border-line hover:border-gold-light'}`}>
                {bonus(p) > 0 && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-semibold bg-gold-grad text-plum-deep rounded-full px-2 py-0.5 whitespace-nowrap">+{bonus(p)}% bonus</span>}
                <p className="font-serif text-xl font-semibold">{inr(p)}</p>
              </button>
            ))}
          </div>
          <Field label="Or enter amount" error={err}><input type="number" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="₹ Custom amount" className={`input ${err ? 'input-error' : ''}`} /></Field>
          <div className="rounded-2xl bg-cream/60 p-4 mt-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted">Recharge</span><span>{inr(value || 0)}</span></div>
            <div className="flex justify-between text-emerald-700"><span>Bonus ({bonus(value || 0)}%)</span><span>+{inr(Math.round(((value || 0) * bonus(value || 0)) / 100))}</span></div>
            <div className="flex justify-between font-semibold pt-1 border-t border-line"><span>You get</span><span>{inr((value || 0) + Math.round(((value || 0) * bonus(value || 0)) / 100))}</span></div>
          </div>
          <div className="mt-4"><RechargeButtons amount={value || 0} disabled={!!err || !value} onDone={() => { setCustom(''); tx.reload(true); }} /></div>
        </div>
      </div>
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3 mb-4"><h2 className="font-serif text-xl font-semibold text-plum">Transaction history</h2><Tabs value={filter} onChange={setFilter} tabs={[{ key: 'all', label: 'All' }, { key: 'in', label: 'In' }, { key: 'out', label: 'Out' }]} /></div>
        {tx.error ? <ErrorState message={tx.error} onRetry={() => tx.reload()} /> : tx.loading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div> : list.length === 0 ? <EmptyState icon={Wallet} title="No transactions" /> : (
          <div className="divide-y divide-line">
            {list.map((t) => {
              const credit = ['credit', 'refund'].includes(t.type);
              const I = t.type === 'refund' ? RotateCcw : t.description?.toLowerCase().includes('bonus') || t.description?.toLowerCase().includes('welcome') ? Gift : credit ? ArrowDownLeft : ArrowUpRight;
              return (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${credit ? 'bg-emerald-50 text-emerald-700' : 'bg-blush text-rose-deep'}`}><I className="h-4 w-4" /></span>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{t.description}</p><p className="text-xs text-muted">{fmtDateTime(t.created_at)} · {t.reference}</p></div>
                  <span className={`font-semibold text-sm ${credit ? 'text-emerald-700' : t.type === 'payment' ? 'text-muted' : 'text-ink'}`}>{credit ? '+' : '−'}{inr(t.amount, 0)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Favorites() {
  const { data, loading, error, reload } = useApi<any[]>('/api/me?section=favorites');
  if (error) return <ErrorState message={error} onRetry={() => reload()} />;
  return loading ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <AstrologerCardSkeleton key={i} />)}</div> : (data || []).length === 0 ? (
    <div className="card"><EmptyState icon={Heart} title="No favourites yet" text="Tap the heart on any astrologer to follow them and find them quickly here." action={<Link to="/dashboard/astrologers" className="btn btn-rose btn-sm">Discover astrologers</Link>} /></div>
  ) : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{(data || []).map((f, i) => f.astrologers && <AstrologerCard key={f.id} a={f.astrologers} index={i} />)}</div>;
}

function Notifications() {
  const { data, loading, error, reload } = useApi<any[]>('/api/me?section=notifications');
  const { toast } = useToast();
  const markAll = async () => { try { await api('/api/me', { method: 'POST', body: { action: 'read_notifications' } }); reload(true); toast('All caught up ✨'); } catch (e: any) { toast(e.message, 'error'); } };
  const icon: Record<string, any> = { wallet: Wallet, booking: CalendarDays, consultation: MessageCircle, promo: Gift, horoscope: Sun };
  const unread = (data || []).filter((n) => !n.read && n.user_id).length;
  return (
    <div className="card">
      <div className="flex items-center justify-between p-5 border-b border-line"><p className="text-sm text-muted">{unread} unread</p><button onClick={markAll} disabled={!unread} className="btn btn-outline btn-sm">Mark all read</button></div>
      {error ? <div className="p-5"><ErrorState message={error} onRetry={() => reload()} /></div> : loading ? <div className="p-5 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div> : (data || []).length === 0 ? <EmptyState icon={Bell} title="No notifications" text="Booking updates, wallet alerts and offers will appear here." /> : (
        <div className="divide-y divide-line">
          {(data || []).map((n) => { const I = icon[n.type] || Sparkles; return (
            <div key={n.id} className={`flex gap-4 p-5 ${!n.read && n.user_id ? 'bg-blush/25' : ''}`}>
              <span className="h-10 w-10 rounded-xl bg-cream flex items-center justify-center shrink-0"><I className="h-4 w-4 text-gold-deep" /></span>
              <div className="flex-1 min-w-0"><p className="font-medium flex items-center gap-2">{n.title}{!n.read && n.user_id && <span className="h-2 w-2 rounded-full bg-rose" />}</p><p className="text-sm text-muted mt-0.5">{n.body}</p><p className="text-xs text-muted/80 mt-1">{timeAgo(n.created_at)}</p></div>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

function Profile() {
  const { profile } = useAuth();
  if (!profile) return <Skeleton className="h-96" />;
  return <div className="space-y-6"><ProfileForm key={profile.user_id} /><PrivacyCard /></div>;
}

function PrivacyCard() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const download = async () => {
    try {
      const data = await api('/api/me?section=export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = `astro-venus-my-data-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
    } catch (e: any) { toast(e.message, 'error'); }
  };
  const del = async () => {
    setBusy(true);
    try { await api('/api/me', { method: 'POST', body: { action: 'delete_account', confirm } }); await signOut(); toast('Your account has been deleted', 'info'); nav('/'); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="card p-6 sm:p-8">
      <h2 className="font-serif text-xl font-semibold text-plum">Privacy & data</h2>
      <p className="text-sm text-muted mt-1">Your rights under the Digital Personal Data Protection Act, 2023. See our <Link to="/legal/privacy" className="text-rose-deep">Privacy Policy</Link>.</p>
      <div className="flex flex-wrap gap-2 mt-5">
        <button type="button" onClick={download} className="btn btn-outline btn-sm">Download my data</button>
        <button type="button" onClick={() => { setConfirm(''); setOpen(true); }} className="btn btn-ghost btn-sm !text-danger">Delete my account</button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete account?" size="sm">
        <p className="text-sm text-muted">This permanently deletes your profile, birth details, saved Kundlis and favourites, and signs you out. Remaining wallet balance is forfeited unless you request a refund first. Financial records are kept in anonymised form as required by law.</p>
        <Field label='Type "DELETE" to confirm'><input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        <button onClick={del} disabled={confirm !== 'DELETE' || busy} className="btn btn-danger w-full mt-4">{busy ? 'Deleting…' : 'Permanently delete'}</button>
      </Modal>
    </div>
  );
}

function ProfileForm() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [f, setF] = useState<any>(() => ({ full_name: profile?.full_name || '', phone: profile?.phone || '', gender: profile?.gender || '', dob: profile?.dob || '', tob: profile?.tob || '', birth_place: profile?.birth_place || '', zodiac: profile?.zodiac || '' }));
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (!profile) return <Skeleton className="h-96" />;
  const set = (k: string, v: string) => setF((x: any) => ({ ...x, [k]: v }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.full_name.trim()) er.full_name = 'Name is required';
    if (f.phone && !/^[+\d\s-]{8,16}$/.test(f.phone)) er.phone = 'Enter a valid phone number';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    try { await api('/api/me', { method: 'PUT', body: { ...f, zodiac: f.zodiac || signFromDate(f.dob) || null } }); await refreshProfile(); toast('Profile updated'); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="grid lg:grid-cols-[300px_1fr] gap-6">
      <div className="card gold-border p-6 text-center h-fit">
        <label className="relative block w-fit mx-auto cursor-pointer group" title="Change photo">
          <Avatar src={profile.avatar} name={profile.full_name} size={96} className="ring-4 ring-gold-light" />
          <span className="absolute inset-0 rounded-full bg-plum/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">Change</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 3 * 1024 * 1024) { toast('Image must be under 3 MB', 'error'); return; } try { await api('/api/me', { method: 'POST', body: { action: 'avatar', base64: await fileToBase64(file), contentType: file.type, name: file.name } }); await refreshProfile(); toast('Photo updated'); } catch (x: any) { toast(x.message, 'error'); } }} />
        </label>
        <p className="font-serif text-2xl font-semibold text-plum mt-4">{profile.full_name}</p>
        <p className="text-sm text-muted">{user?.email}</p>
        {signByKey(f.zodiac || signFromDate(f.dob)) && <p className="chip chip-gold mt-3">{g(signByKey(f.zodiac || signFromDate(f.dob))!.glyph)} {signByKey(f.zodiac || signFromDate(f.dob))!.name}</p>}
        <p className="text-xs text-muted mt-4">Member since {fmtDate(profile.created_at)}</p>
      </div>
      <div className="card p-6 sm:p-8">
        <h2 className="font-serif text-xl font-semibold text-plum">Personal details</h2>
        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <Field label="Full name" error={err.full_name}><input className={`input ${err.full_name ? 'input-error' : ''}`} value={f.full_name} onChange={(e) => set('full_name', e.target.value)} /></Field>
          <Field label="Phone" error={err.phone}><input className={`input ${err.phone ? 'input-error' : ''}`} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98xxxxxx" /></Field>
          <Field label="Gender"><select className="input" value={f.gender} onChange={(e) => set('gender', e.target.value)}><option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></Field>
          <Field label="Zodiac sign" hint="Auto-detected from date of birth if left blank"><select className="input" value={f.zodiac} onChange={(e) => set('zodiac', e.target.value)}><option value="">Auto</option>{SIGNS.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}</select></Field>
        </div>
        <h2 className="font-serif text-xl font-semibold text-plum mt-8">Birth details</h2>
        <p className="text-sm text-muted">Shared with your astrologer to speed up consultations.</p>
        <div className="grid sm:grid-cols-3 gap-4 mt-5">
          <Field label="Date of birth"><input type="date" className="input" value={f.dob} onChange={(e) => set('dob', e.target.value)} max={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Time of birth"><input type="time" className="input" value={f.tob} onChange={(e) => set('tob', e.target.value)} /></Field>
          <Field label="Place of birth"><input className="input" value={f.birth_place} onChange={(e) => set('birth_place', e.target.value)} placeholder="City, Country" /></Field>
        </div>
        <button disabled={busy} className="btn btn-rose mt-8">{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}

function Support() {
  const tickets = useApi<any[]>('/api/me?section=tickets');
  const { toast } = useToast();
  const [open, setOpen] = useState<number | null>(0);
  const [f, setF] = useState({ subject: '', category: 'Payments', message: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const faqs = [
    ['How does per-minute billing work?', 'Chat, audio and video consultations are billed per started minute at the astrologer’s listed rate. A minimum balance of 3 minutes is needed to start. You can end anytime.'],
    ['What is the cancellation and refund policy?', 'Cancel scheduled bookings 2+ hours before for a 100% wallet refund, or within 2 hours for 50%. Refunds are instant.'],
    ['Are my consultations private?', 'Yes. Conversations are only visible to you and your astrologer. We never share your birth details or chats.'],
    ['How are astrologers verified?', 'Every astrologer completes identity KYC, bank verification and a skills interview before the verified badge appears.'],
    ['My wallet recharge failed but money was deducted', 'Such payments auto-reverse within 5–7 working days. Raise a ticket below with your reference and we’ll expedite it.'],
  ];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.subject.trim().length < 4) er.subject = 'Please add a short subject';
    if (f.message.trim().length < 15) er.message = 'Please describe the issue (15+ characters)';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    try { await api('/api/me', { method: 'POST', body: { action: 'ticket', ...f } }); toast('Ticket raised — we’ll reply within 24 hours'); setF({ subject: '', category: 'Payments', message: '' }); tickets.reload(true); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="font-serif text-xl font-semibold text-plum mb-3">Frequently asked</h2>
          {faqs.map(([q, a], i) => (
            <div key={q} className="border-b border-line last:border-0">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between py-4 text-left font-medium text-sm gap-4">{q}<ChevronDown className={`h-4 w-4 shrink-0 transition ${open === i ? 'rotate-180 text-rose' : 'text-muted'}`} /></button>
              {open === i && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-sm text-muted pb-4 leading-relaxed">{a}</motion.p>}
            </div>
          ))}
        </div>
        <div className="card p-6">
          <h2 className="font-serif text-xl font-semibold text-plum mb-3">My tickets</h2>
          {tickets.loading ? <Skeleton className="h-16" /> : (tickets.data || []).length === 0 ? <p className="text-sm text-muted">No tickets raised.</p> : (tickets.data || []).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3 border-b border-line last:border-0"><div className="min-w-0"><p className="text-sm font-medium truncate">{t.subject}</p><p className="text-xs text-muted">{t.category} · {timeAgo(t.created_at)}</p></div><Badge status={t.status} /></div>
          ))}
        </div>
      </div>
      <form onSubmit={submit} className="card gold-border p-6 h-fit">
        <h2 className="font-serif text-xl font-semibold text-plum">Contact support</h2>
        <p className="text-sm text-muted">Our care team replies within 24 hours.</p>
        <div className="space-y-4 mt-5">
          <Field label="Category"><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{['Payments', 'Wallet & Refunds', 'Consultation', 'Booking', 'Account', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Subject" error={err.subject}><input className={`input ${err.subject ? 'input-error' : ''}`} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
          <Field label="Message" error={err.message}><textarea rows={5} className={`input ${err.message ? 'input-error' : ''}`} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Include booking reference or transaction ID if relevant" /></Field>
          <button disabled={busy} className="btn btn-rose w-full"><Send className="h-4 w-4" /> {busy ? 'Sending…' : 'Submit ticket'}</button>
        </div>
      </form>
    </div>
  );
}

