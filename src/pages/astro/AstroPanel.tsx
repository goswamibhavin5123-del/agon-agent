import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Radio, CalendarDays, Clock, History, IndianRupee, Star, Users, Bell, User, ShieldCheck, Settings, Power, Send, MessageCircle, Phone, Video, TrendingUp, Wallet, CheckCircle2, Upload, FileText, ArrowLeftRight, Sparkles, Search } from 'lucide-react';
import PanelShell from '../../components/PanelShell';
import { useApi, api, fileToBase64 } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PageLoader, ErrorState, EmptyState, StatCard, Badge, Stars, Field, Tabs, Modal, Avatar, Verified, Skeleton } from '../../components/ui';
import { AreaChart } from '../../components/Charts';
import CallRoom from '../../components/CallRoom';
import { inr, fmtDateTime, fmtDate, fmtTime, timeAgo, fmtDuration, MODES, DAY_LABEL } from '../../lib/format';
import { EXPERTISE, LANGUAGES } from '../Astrologers';
import { g, SIGNS } from '../../lib/zodiac';

/** The astrologer workspace is bound to the signed-in account; the server derives the profile from the session. */
export default function AstroPanel() {
  const { profile, signOut } = useAuth();
  return <Workspace id={profile?.astrologer?.id} onSignOut={signOut} />;
}

function Workspace({ id, onSignOut }: { id: number; onSignOut: () => Promise<void> }) {
  const { data, loading, error, reload } = useApi<any>('/api/astro-panel');
  const { toast } = useToast();
  const [toggling, setToggling] = useState(false);
  useEffect(() => { const t = setInterval(() => reload(true), 8000); return () => clearInterval(t); }, [reload]);

  if (loading && !data) return <PageLoader label="Loading your workspace…" />;
  if (error && !data) return <div className="p-8"><ErrorState message={error} onRetry={() => reload()} /></div>;
  const a = data.astrologer;
  const unread = data.notifications.filter((n: any) => !n.read && n.astrologer_id).length;
  const toggle = async () => {
    setToggling(true);
    try { await api('/api/astro-panel', { method: 'POST', body: { action: 'toggle_online', astrologer_id: id, is_online: !a.is_online } }); toast(!a.is_online ? 'You are now online — seekers can reach you' : 'You are offline', !a.is_online ? 'success' : 'info'); reload(true); } catch (e: any) { toast(e.message, 'error'); } finally { setToggling(false); }
  };
  const items = [
    { to: '/astro-panel', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/astro-panel/incoming', label: 'Live Sessions', icon: Radio, badge: data.live.length || undefined },
    { to: '/astro-panel/bookings', label: 'Bookings', icon: CalendarDays, badge: data.bookings.filter((b: any) => b.status === 'upcoming').length || undefined },
    { to: '/astro-panel/availability', label: 'Availability', icon: Clock },
    { to: '/astro-panel/consultations', label: 'Consultations', icon: History },
    { to: '/astro-panel/earnings', label: 'Earnings & Wallet', icon: IndianRupee },
    { to: '/astro-panel/reviews', label: 'Reviews', icon: Star },
    { to: '/astro-panel/followers', label: 'Followers', icon: Users },
    { to: '/astro-panel/notifications', label: 'Notifications', icon: Bell, badge: unread || undefined },
    { to: '/astro-panel/profile', label: 'Profile', icon: User },
    { to: '/astro-panel/kyc', label: 'KYC', icon: ShieldCheck },
    { to: '/astro-panel/settings', label: 'Settings', icon: Settings },
  ];
  const ctx = { data, reload, id, a };
  return (
    <PanelShell items={items} title="Astrologer Panel" subtitle={a.name} dark
      topRight={<button onClick={toggle} disabled={toggling} className={`flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition ${a.is_online ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-stone-200 text-stone-600'}`}><Power className="h-4 w-4" /><span className="hidden sm:inline">{a.is_online ? 'Online' : 'Offline'}</span></button>}
      footer={<div className="flex items-center gap-3 px-2"><img src={a.photo} className="h-9 w-9 rounded-full object-cover" alt="" /><div className="flex-1 min-w-0"><p className="text-sm truncate">{a.name}</p><button onClick={() => onSignOut()} className="text-[11px] text-gold-light flex items-center gap-1"><ArrowLeftRight className="h-3 w-3" /> Sign out</button></div></div>}>
      <Routes>
        <Route index element={<Overview {...ctx} />} />
        <Route path="incoming" element={<Incoming {...ctx} />} />
        <Route path="bookings" element={<ABookings {...ctx} />} />
        <Route path="availability" element={<Availability {...ctx} />} />
        <Route path="consultations" element={<Consultations {...ctx} />} />
        <Route path="earnings" element={<Earnings {...ctx} />} />
        <Route path="reviews" element={<Reviews {...ctx} />} />
        <Route path="followers" element={<Followers {...ctx} />} />
        <Route path="notifications" element={<ANotifications {...ctx} />} />
        <Route path="profile" element={<AProfile {...ctx} />} />
        <Route path="kyc" element={<Kyc {...ctx} />} />
        <Route path="settings" element={<ASettings {...ctx} />} />
      </Routes>
    </PanelShell>
  );
}

type Ctx = { data: any; reload: (s?: boolean) => Promise<void>; id: number; a: any };

function Overview({ data, a }: Ctx) {
  const e = data.earnings;
  const upcoming = data.bookings.filter((b: any) => b.status === 'upcoming' && new Date(b.scheduled_at).getTime() > Date.now() - 3600000).slice(0, 5);
  return (
    <div className="space-y-6">
      {data.live.length > 0 && (
        <Link to="/astro-panel/incoming" className="flex items-center gap-4 rounded-[1.5rem] bg-rose-grad text-white p-5 shadow-rose">
          <span className="relative h-12 w-12 rounded-full bg-white/20 flex items-center justify-center"><span className="absolute inset-0 rounded-full border-2 border-white/60 animate-pulse-ring" /><Radio className="h-5 w-5" /></span>
          <div className="flex-1"><p className="font-serif text-xl">{data.live.length} live session{data.live.length > 1 ? 's' : ''} waiting</p><p className="text-sm text-white/80">{data.live.map((l: any) => l.user_name).join(', ')}</p></div>
          <span className="btn btn-white btn-sm">Respond</span>
        </Link>
      )}
      {a.kyc_status !== 'approved' && (
        <Link to="/astro-panel/kyc" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm"><ShieldCheck className="h-5 w-5 text-warn" /><span className="flex-1 text-amber-800">{a.kyc_status === 'pending' ? 'Your KYC is under review.' : 'Complete KYC to receive payouts and the verified badge.'}</span><span className="font-medium text-amber-800">{a.kyc_status === 'pending' ? 'View' : 'Start KYC →'}</span></Link>
      )}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={IndianRupee} label="Today's earnings" value={inr(e.today)} sub={`After ${e.commission}% platform fee`} tone="gold" />
        <StatCard icon={Wallet} label="Available" value={inr(e.available)} sub="Ready to withdraw" tone="green" />
        <StatCard icon={MessageCircle} label="Consultations" value={a.orders_count.toLocaleString('en-IN')} sub={`${data.consultations.length} on platform`} tone="rose" />
        <StatCard icon={Star} label="Rating" value={Number(a.rating).toFixed(1)} sub={`${a.reviews_count} reviews · ${a.followers} followers`} tone="plum" />
      </div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="card p-6"><div className="flex items-center justify-between mb-4"><h2 className="font-serif text-xl font-semibold text-plum">Net earnings · 14 days</h2><TrendingUp className="h-5 w-5 text-gold" /></div><AreaChart data={e.series} prefix="₹" /></div>
        <div className="card p-6">
          <h2 className="font-serif text-xl font-semibold text-plum mb-3">Upcoming sessions</h2>
          {upcoming.length === 0 ? <p className="text-sm text-muted py-6 text-center">No upcoming bookings.</p> : upcoming.map((b: any) => { const M = MODES[b.mode as keyof typeof MODES]; return (
            <div key={b.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0"><span className="h-9 w-9 rounded-xl bg-lilac flex items-center justify-center"><M.icon className="h-4 w-4 text-plum" /></span><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.user_name}</p><p className="text-xs text-muted">{b.services?.name || M.label} · {b.duration} min</p></div><p className="text-xs text-right">{fmtDateTime(b.scheduled_at)}</p></div>
          ); })}
        </div>
      </div>
      <div className="card p-6">
        <h2 className="font-serif text-xl font-semibold text-plum mb-3">Latest reviews</h2>
        {data.reviews.length === 0 ? <p className="text-sm text-muted">No reviews yet.</p> : <div className="grid md:grid-cols-3 gap-3">{data.reviews.slice(0, 3).map((r: any) => <div key={r.id} className="rounded-2xl bg-cream/50 p-4"><Stars value={r.rating} size={12} /><p className="text-sm mt-2 line-clamp-3">{r.comment || 'No comment'}</p><p className="text-xs text-muted mt-2">{r.user_name} · {timeAgo(r.created_at)}</p></div>)}</div>}
      </div>
    </div>
  );
}

function Incoming({ data, id, reload }: Ctx) {
  const { toast } = useToast();
  const [sel, setSel] = useState<number | null>(data.live[0]?.id || null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [inCall, setInCall] = useState<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const current = data.live.find((c: any) => c.id === sel);
  const endSession = async (cid: number) => {
    try { await api('/api/astro-panel', { method: 'POST', body: { action: 'end_consultation', consultation_id: cid } }); toast('Consultation ended', 'info'); setInCall(null); reload(true); } catch (e: any) { toast(e.message, 'error'); }
  };
  useEffect(() => { if (!sel && data.live[0]) setSel(data.live[0].id); }, [data.live, sel]);
  useEffect(() => {
    if (!sel) return;
    let stop = false;
    const load = () => api(`/api/astro-panel?section=messages&consultation_id=${sel}`).then((m) => !stop && setMsgs(m)).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [sel]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !sel) return;
    setSending(true);
    try { const m = await api('/api/astro-panel', { method: 'POST', body: { action: 'reply', astrologer_id: id, consultation_id: sel, content: text } }); setMsgs((x) => [...x, m]); setText(''); } catch (err: any) { toast(err.message, 'error'); reload(true); } finally { setSending(false); }
  };
  if (data.live.length === 0) return <div className="card"><EmptyState icon={Radio} title="No live sessions" text="Stay online to receive incoming chats and calls. New sessions appear here automatically." /></div>;
  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-5 h-[calc(100vh-220px)] min-h-[500px]">
      <div className="card p-2 overflow-y-auto">
        {data.live.map((c: any) => { const M = MODES[c.mode as keyof typeof MODES]; return (
          <button key={c.id} onClick={() => setSel(c.id)} className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left ${sel === c.id ? 'bg-blush' : 'hover:bg-cream'}`}>
            <Avatar name={c.user_name} size={42} />
            <div className="flex-1 min-w-0"><p className="font-medium truncate">{c.user_name}</p><p className="text-xs text-muted flex items-center gap-1"><M.icon className="h-3 w-3" />{M.label} · {fmtDuration((Date.now() - new Date(c.started_at).getTime()) / 1000)}</p></div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        ); })}
      </div>
      <div className="card flex flex-col min-h-0">
        {current && <div className="flex items-center gap-3 p-4 border-b border-line"><Avatar name={current.user_name} size={40} /><div className="flex-1"><p className="font-medium">{current.user_name}</p><p className="text-xs text-muted">{MODES[current.mode as keyof typeof MODES].label} · {current.prepaid ? 'Prepaid booking' : `${inr(current.rate)}/min`}</p></div>{current.mode !== 'chat' && (data.calls_enabled ? <button onClick={() => setInCall(current)} className="btn btn-rose btn-sm">{current.mode === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />} Join call</button> : <span className="text-xs text-muted">Calling not configured</span>)}<button onClick={() => endSession(current.id)} className="btn btn-ghost btn-sm !text-danger">End</button></div>}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.map((m) => m.sender === 'system' ? <div key={m.id} className="text-center"><span className="text-[11px] text-muted bg-cream rounded-full px-3 py-1">{m.content}</span></div> : (
            <div key={m.id} className={`flex ${m.sender === 'astrologer' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 ${m.sender === 'astrologer' ? 'bg-plum text-white rounded-br-md' : 'bg-cream rounded-bl-md'}`}>
                {m.kind === 'voice' ? (m.content ? <audio src={m.content} controls className="h-9 max-w-[240px]" /> : <span className="text-xs">Voice note unavailable</span>) : <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
                <p className={`text-[10px] mt-1 ${m.sender === 'astrologer' ? 'text-white/60' : 'text-muted'}`}>{fmtTime(m.created_at)}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="p-3 border-t border-line flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply to seeker… (disables auto-assistant for this session)" className="input !rounded-full" />
          <button disabled={sending || !text.trim()} className="btn btn-rose !px-4"><Send className="h-4 w-4" /></button>
        </form>
      </div>
      {inCall && (
        <div className="fixed inset-0 z-[90]">
          <CallRoom video={inCall.mode === 'video'} peerName={inCall.user_name} onEnd={() => endSession(inCall.id)}
            getToken={() => api('/api/astro-panel', { method: 'POST', body: { action: 'call_token', consultation_id: inCall.id } })}>
            <button onClick={() => setInCall(null)} className="absolute top-4 left-4 btn btn-white btn-sm">Minimise</button>
          </CallRoom>
        </div>
      )}
    </div>
  );
}

function ABookings({ data, id, reload }: Ctx) {
  const { toast } = useToast();
  const [tab, setTab] = useState('upcoming');
  const list = data.bookings.filter((b: any) => (tab === 'upcoming' ? b.status === 'upcoming' : tab === 'completed' ? b.status === 'completed' : ['cancelled', 'refunded'].includes(b.status)));
  const complete = async (bid: number) => { try { await api('/api/astro-panel', { method: 'POST', body: { action: 'booking_status', astrologer_id: id, id: bid, status: 'completed' } }); toast('Marked completed'); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  return (
    <div className="space-y-5">
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'upcoming', label: 'Upcoming' }, { key: 'completed', label: 'Completed' }, { key: 'cancelled', label: 'Cancelled' }]} className="w-fit" />
      {list.length === 0 ? <div className="card"><EmptyState icon={CalendarDays} title={`No ${tab} bookings`} /></div> : (
        <div className="card overflow-x-auto"><table className="table-lux min-w-[720px]"><thead><tr><th>Seeker</th><th>Service</th><th>Mode</th><th>When</th><th>Duration</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
          {list.map((b: any) => <tr key={b.id}><td className="font-medium">{b.user_name}{b.notes && <p className="text-xs text-muted font-normal max-w-[200px] truncate" title={b.notes}>“{b.notes}”</p>}</td><td>{b.services?.name || '—'}</td><td className="capitalize">{b.mode}</td><td>{fmtDateTime(b.scheduled_at)}</td><td>{b.duration} min</td><td>{inr(b.total)}</td><td><Badge status={b.status} /></td><td>{b.status === 'upcoming' && new Date(b.scheduled_at).getTime() < Date.now() && <button onClick={() => complete(b.id)} className="btn btn-outline btn-sm"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</button>}</td></tr>)}
        </tbody></table></div>
      )}
    </div>
  );
}

function Availability({ a, id, reload }: Ctx) {
  const { toast } = useToast();
  const [av, setAv] = useState<any>(() => a.availability || {});
  const [busy, setBusy] = useState(false);
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const set = (d: string, k: string, v: any) => setAv((x: any) => ({ ...x, [d]: { start: '10:00', end: '18:00', on: false, ...x[d], [k]: v } }));
  const save = async () => {
    for (const d of days) if (av[d]?.on && av[d].start >= av[d].end) { toast(`${DAY_LABEL[d]}: end time must be after start`, 'error'); return; }
    setBusy(true);
    try { await api('/api/astro-panel', { method: 'POST', body: { action: 'availability', astrologer_id: id, availability: av } }); toast('Availability saved'); reload(true); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="card p-6 max-w-3xl">
      <h2 className="font-serif text-xl font-semibold text-plum">Weekly schedule</h2>
      <p className="text-sm text-muted">Seekers can book 30-minute slots within these hours.</p>
      <div className="mt-5 divide-y divide-line">
        {days.map((d) => (
          <div key={d} className="flex flex-wrap items-center gap-3 py-3">
            <label className="flex items-center gap-3 w-40"><input type="checkbox" checked={!!av[d]?.on} onChange={(e) => set(d, 'on', e.target.checked)} className="h-4 w-4 accent-[#D9678A]" /><span className="font-medium">{DAY_LABEL[d]}</span></label>
            {av[d]?.on ? <div className="flex items-center gap-2"><input type="time" value={av[d].start} onChange={(e) => set(d, 'start', e.target.value)} className="input !w-32 !py-2" /><span className="text-muted">to</span><input type="time" value={av[d].end} onChange={(e) => set(d, 'end', e.target.value)} className="input !w-32 !py-2" /></div> : <span className="text-sm text-muted">Unavailable</span>}
          </div>
        ))}
      </div>
      <button onClick={save} disabled={busy} className="btn btn-rose mt-6">{busy ? 'Saving…' : 'Save availability'}</button>
    </div>
  );
}

function Consultations({ data }: Ctx) {
  const [mode, setMode] = useState('all');
  const list = data.consultations.filter((c: any) => mode === 'all' || c.mode === mode);
  return (
    <div className="space-y-5">
      <Tabs value={mode} onChange={setMode} tabs={[{ key: 'all', label: 'All' }, { key: 'chat', label: 'Chat' }, { key: 'audio', label: 'Audio' }, { key: 'video', label: 'Video' }]} className="w-fit" />
      {list.length === 0 ? <div className="card"><EmptyState icon={History} title="No consultations yet" /></div> : (
        <div className="card overflow-x-auto"><table className="table-lux min-w-[640px]"><thead><tr><th>Seeker</th><th>Mode</th><th>Date</th><th>Duration</th><th>Billed</th><th>Rating</th></tr></thead><tbody>
          {list.map((c: any) => <tr key={c.id}><td className="font-medium">{c.user_name}</td><td className="capitalize">{c.mode}</td><td>{fmtDateTime(c.created_at)}</td><td>{fmtDuration(c.duration_sec || 0)}</td><td>{c.prepaid ? 'Prepaid' : inr(c.amount)}</td><td>{c.rating ? <Stars value={c.rating} size={12} /> : <span className="text-muted">—</span>}</td></tr>)}
        </tbody></table></div>
      )}
    </div>
  );
}

function Earnings({ data, id, reload }: Ctx) {
  const { toast } = useToast();
  const e = data.earnings;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Bank transfer');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const withdraw = async () => {
    const v = Number(amount);
    if (!v || v < 500) return setErr('Minimum withdrawal is ₹500');
    if (v > e.available) return setErr(`You can withdraw up to ${inr(e.available)}`);
    setBusy(true); setErr('');
    try { await api('/api/astro-panel', { method: 'POST', body: { action: 'withdraw', astrologer_id: id, amount: v, method } }); toast('Withdrawal requested'); setOpen(false); setAmount(''); reload(true); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-plum-grad p-7 text-white">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-light/80">Wallet · available to withdraw</p>
          <p className="font-display text-5xl text-gold-grad mt-2">{inr(e.available)}</p>
          <div className="grid grid-cols-3 gap-3 mt-6 text-sm">
            <div><p className="text-white/50 text-xs">Gross</p><p className="font-medium">{inr(e.gross)}</p></div>
            <div><p className="text-white/50 text-xs">Platform ({e.commission}%)</p><p className="font-medium">−{inr(e.gross - e.net)}</p></div>
            <div><p className="text-white/50 text-xs">Withdrawn</p><p className="font-medium">{inr(e.withdrawn)}</p></div>
          </div>
          <button onClick={() => setOpen(true)} disabled={e.available < 500} className="btn btn-gold mt-6">Withdraw funds</button>
          {data.astrologer.kyc_status !== 'approved' && <p className="text-xs text-gold-light/70 mt-2">Payouts are released after KYC approval.</p>}
        </div>
        <div className="card p-6"><h2 className="font-serif text-xl font-semibold text-plum mb-3">Net earnings trend</h2><AreaChart data={e.series} prefix="₹" height={170} color="#C9A04A" /></div>
      </div>
      <div className="card p-6">
        <h2 className="font-serif text-xl font-semibold text-plum mb-3">Withdrawals</h2>
        {e.withdrawals.length === 0 ? <p className="text-sm text-muted">No withdrawals yet.</p> : <div className="overflow-x-auto"><table className="table-lux min-w-[520px]"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>{e.withdrawals.map((w: any) => <tr key={w.id}><td>{fmtDateTime(w.created_at)}</td><td className="font-medium">{inr(w.amount)}</td><td>{w.method}</td><td><Badge status={w.status} /></td></tr>)}</tbody></table></div>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Withdraw funds" size="sm">
        <p className="text-sm text-muted">Available: <b className="text-ink">{inr(e.available)}</b></p>
        <div className="space-y-4 mt-4">
          <Field label="Amount" error={err}><input type="number" value={amount} onChange={(x) => setAmount(x.target.value)} className={`input ${err ? 'input-error' : ''}`} placeholder="Min ₹500" /></Field>
          <Field label="Method"><select value={method} onChange={(x) => setMethod(x.target.value)} className="input"><option>Bank transfer</option><option>UPI</option></select></Field>
          <button onClick={withdraw} disabled={busy} className="btn btn-rose w-full">{busy ? 'Requesting…' : 'Request withdrawal'}</button>
        </div>
      </Modal>
    </div>
  );
}

function Reviews({ data, a }: Ctx) {
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: data.reviews.filter((r: any) => r.rating === s).length }));
  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-5">
      <div className="card p-6 text-center h-fit"><p className="font-display text-5xl text-plum">{Number(a.rating).toFixed(1)}</p><Stars value={a.rating} size={16} className="mt-2" /><p className="text-sm text-muted mt-1">{data.reviews.length} reviews</p>
        <div className="mt-5 space-y-1.5">{dist.map((d) => <div key={d.s} className="flex items-center gap-2 text-xs"><span className="w-5">{d.s}★</span><div className="flex-1 h-1.5 bg-cream rounded-full overflow-hidden"><div className="h-full bg-gold-grad" style={{ width: `${data.reviews.length ? (d.n / data.reviews.length) * 100 : 0}%` }} /></div><span className="w-6 text-right text-muted">{d.n}</span></div>)}</div>
      </div>
      <div className="space-y-3">{data.reviews.length === 0 ? <div className="card"><EmptyState icon={Star} title="No reviews yet" /></div> : data.reviews.map((r: any) => (
        <div key={r.id} className="card p-5"><div className="flex items-center gap-3"><Avatar name={r.user_name} size={38} /><div className="flex-1"><p className="font-medium">{r.user_name}</p><div className="flex items-center gap-2"><Stars value={r.rating} size={11} /><span className="text-xs text-muted">{timeAgo(r.created_at)}</span></div></div><Badge status={r.status} /></div>{r.comment && <p className="text-sm mt-3 text-ink/80">{r.comment}</p>}</div>
      ))}</div>
    </div>
  );
}

function Followers({ data, a }: Ctx) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 max-w-lg"><StatCard icon={Users} label="Followers" value={a.followers} tone="rose" /><StatCard icon={Sparkles} label="On platform" value={data.followers.length} sub="Signed-in followers" tone="gold" /></div>
      {data.followers.length === 0 ? <div className="card"><EmptyState icon={Users} title="No followers yet" text="Seekers who favourite you will appear here and get notified when you come online." /></div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{data.followers.map((f: any) => { const s = SIGNS.find((x) => x.key === f.profile?.zodiac); return (
          <div key={f.key} className="card p-4 flex items-center gap-3"><Avatar src={f.profile?.avatar} name={f.profile?.full_name || 'Seeker'} size={44} /><div className="flex-1 min-w-0"><p className="font-medium truncate">{f.profile?.full_name || 'Seeker'}</p><p className="text-xs text-muted">Following since {fmtDate(f.created_at)}</p></div>{s && <span className="text-xl text-gold font-serif" title={s.name}>{g(s.glyph)}</span>}</div>
        ); })}</div>
      )}
    </div>
  );
}

function ANotifications({ data, id, reload }: Ctx) {
  const { toast } = useToast();
  const markAll = async () => { try { await api('/api/astro-panel', { method: 'POST', body: { action: 'read_notifications', astrologer_id: id } }); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  return (
    <div className="card">
      <div className="flex justify-end p-4 border-b border-line"><button onClick={markAll} className="btn btn-outline btn-sm">Mark all read</button></div>
      {data.notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" /> : <div className="divide-y divide-line">{data.notifications.map((n: any) => (
        <div key={n.id} className={`p-5 flex gap-4 ${!n.read && n.astrologer_id ? 'bg-blush/25' : ''}`}><span className="h-10 w-10 rounded-xl bg-cream flex items-center justify-center shrink-0"><Bell className="h-4 w-4 text-gold-deep" /></span><div><p className="font-medium">{n.title}</p><p className="text-sm text-muted">{n.body}</p><p className="text-xs text-muted/80 mt-1">{timeAgo(n.created_at)}</p></div></div>
      ))}</div>}
    </div>
  );
}

function AProfile({ a, id, reload }: Ctx) {
  const { toast } = useToast();
  const [f, setF] = useState<any>({ name: a.name, title: a.title, bio: a.bio, city: a.city || '', education: a.education || '', experience: a.experience, chat_price: a.chat_price, call_price: a.call_price, video_price: a.video_price, expertise: a.expertise || [], languages: a.languages || [], photo: a.photo });
  const [busy, setBusy] = useState(false);
  const tog = (k: string, v: string) => setF((x: any) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((i: string) => i !== v) : [...x[k], v] }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.title.trim()) { toast('Name and title are required', 'error'); return; }
    if (!f.expertise.length) { toast('Select at least one expertise', 'error'); return; }
    setBusy(true);
    try { await api('/api/astro-panel', { method: 'POST', body: { action: 'update_profile', astrologer_id: id, fields: { ...f, experience: Number(f.experience), chat_price: Number(f.chat_price), call_price: Number(f.call_price), video_price: Number(f.video_price) } } }); toast('Profile updated'); reload(true); } catch (x: any) { toast(x.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="grid xl:grid-cols-[1fr_320px] gap-6">
      <div className="card p-6 sm:p-8 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Display name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Headline"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="City"><input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
          <Field label="Education"><input className="input" value={f.education} onChange={(e) => setF({ ...f, education: e.target.value })} /></Field>
          <Field label="Experience (years)"><input type="number" min={0} className="input" value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} /></Field>
          <Field label="Profile photo"><label className="flex items-center gap-3 input cursor-pointer"><img src={f.photo} className="h-8 w-8 rounded-lg object-cover" alt="" /><span className="text-sm text-muted flex-1">Upload new photo (JPG/PNG, max 3 MB)</span><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const r = await api('/api/astro-panel', { method: 'POST', body: { action: 'upload_photo', base64: await fileToBase64(file), contentType: file.type, name: file.name } }); setF((x: any) => ({ ...x, photo: r.url })); toast('Photo updated'); reload(true); } catch (x: any) { toast(x.message, 'error'); } }} /></label></Field>
        </div>
        <Field label="About"><textarea rows={5} className="input" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
        <div><p className="label">Expertise</p><div className="flex flex-wrap gap-1.5">{EXPERTISE.map((x) => <button type="button" key={x} onClick={() => tog('expertise', x)} className={`chip ${f.expertise.includes(x) ? 'chip-active' : ''}`}>{x}</button>)}</div></div>
        <div><p className="label">Languages</p><div className="flex flex-wrap gap-1.5">{LANGUAGES.map((x) => <button type="button" key={x} onClick={() => tog('languages', x)} className={`chip ${f.languages.includes(x) ? 'chip-active' : ''}`}>{x}</button>)}</div></div>
      </div>
      <div className="space-y-5">
        <div className="card p-6">
          <h3 className="font-serif text-xl font-semibold text-plum">Pricing per minute</h3>
          <div className="space-y-3 mt-4">
            {[['chat_price', MessageCircle, 'Chat'], ['call_price', Phone, 'Audio call'], ['video_price', Video, 'Video call']].map(([k, I, l]: any) => (
              <label key={k} className="flex items-center gap-3"><I className="h-4 w-4 text-rose-deep" /><span className="flex-1 text-sm">{l}</span><div className="relative w-28"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span><input type="number" min={5} className="input !pl-7 !py-2" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div></label>
            ))}
          </div>
        </div>
        <button disabled={busy} className="btn btn-rose w-full">{busy ? 'Saving…' : 'Save profile'}</button>
        <Link to={`/astrologer/${a.slug}`} className="btn btn-outline w-full">View public profile</Link>
      </div>
    </form>
  );
}

function Kyc({ a, id, reload }: Ctx) {
  const { toast } = useToast();
  const [f, setF] = useState({ pan: '', aadhaar: '', account_name: '', account_number: '', ifsc: '', id_path: '' });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const status = a.kyc_status || 'not_submitted';
  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast('File must be under 3 MB', 'error'); return; }
    setUploading(true);
    try { const base64 = await fileToBase64(file); const r = await api('/api/astro-panel', { method: 'POST', body: { action: 'upload_doc', astrologer_id: id, base64, contentType: file.type, name: file.name } }); setF((x) => ({ ...x, id_path: r.path })); toast('Document uploaded securely'); } catch (e: any) { toast(e.message, 'error'); } finally { setUploading(false); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await api('/api/astro-panel', { method: 'POST', body: { action: 'kyc_submit', astrologer_id: id, docs: f } }); toast('KYC submitted for review'); reload(true); } catch (x: any) { toast(x.message, 'error'); } finally { setBusy(false); }
  };
  const steps = [{ k: 'not_submitted', l: 'Submit documents' }, { k: 'pending', l: 'Under review' }, { k: 'approved', l: 'Verified' }];
  const idx = status === 'approved' ? 2 : status === 'pending' ? 1 : 0;
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-6">
        <div className="flex items-center justify-between"><h2 className="font-serif text-xl font-semibold text-plum">Verification status</h2><Badge status={status} /></div>
        <div className="flex items-center mt-6">{steps.map((s, i) => (<div key={s.k} className="flex-1 flex items-center"><div className="flex flex-col items-center"><span className={`h-9 w-9 rounded-full flex items-center justify-center ${i <= idx ? 'bg-gold-grad text-plum-deep' : 'bg-cream text-muted'}`}>{i < idx || status === 'approved' ? <CheckCircle2 className="h-5 w-5" /> : i + 1}</span><span className="text-xs mt-2 text-center">{s.l}</span></div>{i < 2 && <div className={`flex-1 h-0.5 mx-2 mb-6 ${i < idx ? 'bg-gold' : 'bg-line'}`} />}</div>))}</div>
        {status === 'rejected' && <p className="text-sm text-danger mt-4">Your previous submission was rejected. Please resubmit with clear documents.</p>}
        {a.kyc_summary?.submitted_at && <p className="text-xs text-muted mt-4">Last submitted {fmtDateTime(a.kyc_summary.submitted_at)} · PAN {a.kyc_summary.pan} · Aadhaar {a.kyc_summary.aadhaar}</p>}
      </div>
      {status !== 'approved' && status !== 'pending' && (
        <form onSubmit={submit} className="card p-6 sm:p-8 space-y-5">
          <h3 className="font-serif text-xl font-semibold text-plum">Identity</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="PAN number" hint="Format ABCDE1234F"><input className="input uppercase" maxLength={10} value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} /></Field>
            <Field label="Aadhaar number" hint="12 digits — stored masked"><input className="input" inputMode="numeric" maxLength={14} value={f.aadhaar} onChange={(e) => setF({ ...f, aadhaar: e.target.value.replace(/[^\d ]/g, '') })} /></Field>
          </div>
          <div>
            <p className="label">ID document (PDF/JPG/PNG, max 3 MB)</p>
            <label className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-line p-5 cursor-pointer hover:border-gold">
              {f.id_path ? <FileText className="h-6 w-6 text-success" /> : <Upload className="h-6 w-6 text-gold" />}
              <span className="text-sm flex-1">{uploading ? 'Uploading…' : f.id_path ? 'Document uploaded to private storage — click to replace' : 'Click to upload PAN or Aadhaar scan (stored privately)'}</span>
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          </div>
          <h3 className="font-serif text-xl font-semibold text-plum pt-2">Bank account for payouts</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Account holder"><input className="input" value={f.account_name} onChange={(e) => setF({ ...f, account_name: e.target.value })} /></Field>
            <Field label="Account number"><input className="input" inputMode="numeric" value={f.account_number} onChange={(e) => setF({ ...f, account_number: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="IFSC"><input className="input uppercase" maxLength={11} value={f.ifsc} onChange={(e) => setF({ ...f, ifsc: e.target.value.toUpperCase() })} /></Field>
          </div>
          <button disabled={busy || uploading} className="btn btn-rose">{busy ? 'Submitting…' : 'Submit for verification'}</button>
        </form>
      )}
    </div>
  );
}

function ASettings({ a, id, reload }: Ctx) {
  const { toast } = useToast();
  const [s, setS] = useState<any>({ notify_bookings: true, notify_reviews: true, auto_offline_minutes: 30, accept_video: true, accept_audio: true, ...(a.settings || {}) });
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await api('/api/astro-panel', { method: 'POST', body: { action: 'update_profile', astrologer_id: id, fields: { settings: s } } }); toast('Settings saved'); reload(true); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); } };
  const Toggle = ({ k, label, sub }: { k: string; label: string; sub: string }) => (
    <label className="flex items-center justify-between gap-4 py-4 border-b border-line last:border-0 cursor-pointer"><span><span className="block font-medium text-sm">{label}</span><span className="block text-xs text-muted">{sub}</span></span>
      <button type="button" onClick={() => setS({ ...s, [k]: !s[k] })} className={`relative h-6 w-11 rounded-full transition ${s[k] ? 'bg-rose' : 'bg-line'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${s[k] ? 'left-[22px]' : 'left-0.5'}`} /></button>
    </label>
  );
  return (
    <div className="card p-6 max-w-2xl">
      <h2 className="font-serif text-xl font-semibold text-plum">Preferences</h2>
      <div className="mt-3">
        <Toggle k="notify_bookings" label="Booking alerts" sub="Get notified when a seeker books a session" />
        <Toggle k="notify_reviews" label="Review alerts" sub="Get notified about new reviews" />
        <Toggle k="accept_audio" label="Accept audio calls" sub="Show the call button on your profile" />
        <Toggle k="accept_video" label="Accept video calls" sub="Show the video button on your profile" />
        <label className="flex items-center justify-between py-4"><span><span className="block font-medium text-sm">Auto-offline after inactivity</span><span className="block text-xs text-muted">Minutes without activity</span></span><select value={s.auto_offline_minutes} onChange={(e) => setS({ ...s, auto_offline_minutes: Number(e.target.value) })} className="input !w-28 !py-2">{[15, 30, 60, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
      </div>
      <button onClick={save} disabled={busy} className="btn btn-rose mt-4">{busy ? 'Saving…' : 'Save settings'}</button>
    </div>
  );
}

