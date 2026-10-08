import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Mic, PhoneOff, Play, Pause, Trash2, AlertTriangle, Wallet, Star, ChevronLeft, MessageCircle, X, Clock, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import { api, fileToBase64 } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { PageLoader, ErrorState, Verified, StatusPill, Modal } from '../components/ui';
import CallRoom from '../components/CallRoom';
import RechargeButtons from '../components/Recharge';
import { inr, fmtDuration, fmtTime, MODES } from '../lib/format';

function VoiceBubble({ url, duration, mine }: { url: string; duration?: number; mine: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pct, setPct] = useState(0);
  const bars = [3, 6, 9, 5, 11, 7, 4, 10, 6, 8, 3, 7, 10, 5, 8, 4, 9, 6];
  if (!url) return <span className="text-xs opacity-70">Voice note unavailable</span>;
  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <audio ref={ref} src={url} onTimeUpdate={(e) => setPct((e.currentTarget.currentTime / (e.currentTarget.duration || duration || 1)) * 100)} onEnded={() => { setPlaying(false); setPct(0); }} preload="none" />
      <button onClick={() => { const a = ref.current!; if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }} className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${mine ? 'bg-white/25' : 'bg-rose-grad text-white'}`}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}</button>
      <div className="flex items-center gap-[3px] h-8 flex-1">{bars.map((h, i) => <span key={i} className={`w-[3px] rounded-full ${(i / bars.length) * 100 < pct ? (mine ? 'bg-white' : 'bg-rose') : mine ? 'bg-white/45' : 'bg-rose/30'}`} style={{ height: h * 2.4 }} />)}</div>
      <span className="text-[11px] opacity-80">{fmtDuration(duration || 0)}</span>
    </div>
  );
}

const END_TEXT: Record<string, string> = { balance: 'Ended because your wallet balance ran out.', disconnected: 'Ended because the connection was lost.', no_answer: 'The astrologer did not connect — you were not charged.', time_up: 'Your booked time is complete.', astrologer: 'Ended by the astrologer.', admin: 'Ended by Astro Rahu support.' };

export default function Consultation() {
  const { id } = useParams();
  const nav = useNavigate();
  const { setBalance } = useAuth();
  const { toast } = useToast();
  const [c, setC] = useState<any>(null);
  const [st, setSt] = useState<any>(null);
  const [offset, setOffset] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [rated, setRated] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [recharge, setRecharge] = useState(false);
  const [rAmount, setRAmount] = useState(200);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cancelRec = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);
  const shownEnd = useRef(false);

  const applyState = useCallback((s: any) => {
    setSt(s);
    setOffset(new Date(s.server_now).getTime() - Date.now());
    if (s.balance !== null && s.balance !== undefined) setBalance(s.balance);
  }, [setBalance]);

  const load = useCallback(async () => {
    try {
      const r = await api(`/api/consultations?id=${id}`);
      setC(r.consultation); setMessages(r.messages); applyState(r.state);
      lastId.current = r.messages.reduce((m: number, x: any) => Math.max(m, x.id), 0);
      if (r.consultation.rating) setRated(true);
    } catch (e: any) { setError(e.message); }
  }, [id, applyState]);
  useEffect(() => { load(); }, [load]);

  const active = st?.status === 'active';
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Server-authoritative heartbeat: the server decides charges from its own clock and verified presence.
  useEffect(() => {
    if (!active) return;
    const beat = async () => {
      try {
        const r = await api('/api/consultations', { method: 'POST', body: { action: 'heartbeat', consultation_id: Number(id) } });
        applyState(r.state);
      } catch { /* retried next tick */ }
    };
    beat();
    const t = setInterval(beat, 12000);
    return () => clearInterval(t);
  }, [active, id, applyState]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(async () => {
      try {
        const r = await api(`/api/consultations?id=${id}&after=${lastId.current}`);
        if (r.messages.length) { setMessages((m) => { const ids = new Set(m.map((x) => x.id)); return [...m, ...r.messages.filter((x: any) => !ids.has(x.id))]; }); lastId.current = r.messages.reduce((m: number, x: any) => Math.max(m, x.id), lastId.current); }
        applyState(r.state);
      } catch { /* retry */ }
    }, 3000);
    return () => clearInterval(t);
  }, [active, id, applyState]);

  // When the server ends the session (balance, disconnect…), show the summary once.
  useEffect(() => {
    if (st && st.status === 'ended' && c && !shownEnd.current && (st.end_reason && st.end_reason !== 'customer')) {
      shownEnd.current = true;
      if (END_TEXT[st.end_reason]) toast(END_TEXT[st.end_reason], 'info');
      setSummary({ minutes: st.minutes, seconds: st.duration_sec, rate: st.rate, amount: st.amount, balance: st.balance, prepaid: st.prepaid, reason: st.end_reason });
      api(`/api/consultations?id=${id}`).then((r) => setMessages(r.messages)).catch(() => {});
    }
  }, [st, c, id, toast]);

  const visible = messages.filter((m) => new Date(m.created_at).getTime() <= now + offset + 400);
  const typing = active && messages.some((m) => m.sender === 'astrologer' && new Date(m.created_at).getTime() > now + offset + 400);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [visible.length, typing]);

  const serverNow = now + offset;
  const connectedMs = st?.connected_at ? new Date(st.connected_at).getTime() : null;
  const elapsed = !st ? 0 : !active ? st.duration_sec || 0 : connectedMs ? Math.max(0, (serverNow - connectedMs) / 1000) : 0;
  const paidUntil = st?.paid_until ? new Date(st.paid_until).getTime() : null;
  const extraMinutes = st && !st.prepaid && st.rate ? Math.floor((st.balance || 0) / st.rate) : 0;
  const remainingSec = !st || !connectedMs ? null : st.prepaid ? Math.max(0, (st.max_seconds || 0) - elapsed) : Math.max(0, ((paidUntil || serverNow) - serverNow) / 1000 + extraMinutes * 60);
  const low = active && remainingSec !== null && remainingSec <= 120;

  const end = async () => {
    if (ending) return;
    setEnding(true); setConfirmEnd(false);
    try {
      const r = await api('/api/consultations', { method: 'POST', body: { action: 'end', consultation_id: Number(id) } });
      shownEnd.current = true;
      applyState(r.state); setSummary(r.summary);
      const m = await api(`/api/consultations?id=${id}`); setMessages(m.messages);
    } catch (e: any) { toast(e.message, 'error'); } finally { setEnding(false); }
  };

  const send = async (payload?: { kind: string; content: string; duration?: number }) => {
    const body = payload || { kind: 'text', content: text.trim() };
    if (!body.content) return;
    setSending(true);
    const temp = { id: -Date.now(), sender: 'user', ...body, created_at: new Date(serverNow).toISOString(), pending: true };
    setMessages((m) => [...m, temp]);
    if (!payload) setText('');
    try {
      const msg = await api('/api/consultations', { method: 'POST', body: { action: 'message', consultation_id: Number(id), ...body } });
      setMessages((m) => m.map((x) => (x.id === temp.id ? msg : x)));
      lastId.current = Math.max(lastId.current, msg.id);
    } catch (e: any) { setMessages((m) => m.filter((x) => x.id !== temp.id)); toast(e.message, 'error'); if (!payload) setText(body.content); } finally { setSending(false); }
  };

  const startRec = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(s); chunks.current = []; cancelRec.current = false;
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      const started = Date.now();
      r.onstop = async () => {
        s.getTracks().forEach((t) => t.stop()); setRecording(false);
        if (cancelRec.current) return;
        const dur = Math.round((Date.now() - started) / 1000);
        if (dur < 1) return;
        const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
        try {
          const base64 = await fileToBase64(blob);
          const { path } = await api('/api/consultations', { method: 'POST', body: { action: 'upload_voice', consultation_id: Number(id), base64, contentType: blob.type || 'audio/webm' } });
          await send({ kind: 'voice', content: path, duration: dur });
          const m = await api(`/api/consultations?id=${id}`); setMessages(m.messages);
        } catch (e: any) { toast(e.message || 'Voice note failed to upload', 'error'); }
      };
      r.start(); recRef.current = r; setRecording(true); setRecSec(0);
    } catch { toast('Microphone access is needed to record voice messages', 'error'); }
  };
  useEffect(() => { if (!recording) return; const t = setInterval(() => setRecSec((s) => { if (s >= 119) recRef.current?.stop(); return s + 1; }), 1000); return () => clearInterval(t); }, [recording]);

  const submitRating = async () => {
    if (!rating) { toast('Please choose a star rating', 'error'); return; }
    try { await api('/api/consultations', { method: 'POST', body: { action: 'rate', consultation_id: Number(id), rating, review } }); setRated(true); toast('Thank you for your feedback 🙏'); } catch (e: any) { toast(e.message, 'error'); }
  };

  if (error) return <div className="max-w-2xl mx-auto px-4 py-20"><ErrorState message={error} onRetry={load} /></div>;
  if (!c || !st) return <PageLoader label="Connecting to your astrologer…" />;
  const a = c.astrologers;
  const M = MODES[c.mode as keyof typeof MODES];
  const isCall = c.mode !== 'chat';

  const renderChat = (compact = false) => (
    <div className={`flex flex-col min-h-0 ${compact ? 'h-full' : 'flex-1'}`}>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3">
        {!compact && <div className="flex justify-center"><span className="text-[11px] text-muted bg-pearl border border-line rounded-full px-3 py-1 flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-gold" /> Private & encrypted in transit · guidance only, not medical/legal/financial advice</span></div>}
        {visible.map((m) => m.sender === 'system' ? (
          <div key={m.id} className="flex justify-center"><span className="text-[11px] text-muted bg-cream/80 rounded-full px-3 py-1">{m.content}</span></div>
        ) : (
          <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.sender === 'astrologer' && <img src={a.photo} className="h-7 w-7 rounded-full object-cover self-end" alt="" />}
            <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 ${m.sender === 'user' ? 'bg-rose-grad text-white rounded-br-md shadow-rose' : 'bg-white border border-line rounded-bl-md'}`}>
              {m.kind === 'voice' ? (m.pending ? <span className="text-xs">Uploading voice note…</span> : <VoiceBubble url={m.content} duration={m.duration} mine={m.sender === 'user'} />) : <p className="text-[0.92rem] leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>}
              <p className={`text-[10px] mt-1 text-right ${m.sender === 'user' ? 'text-white/70' : 'text-muted'}`}>{m.pending ? 'Sending…' : fmtTime(m.created_at)}{m.sender === 'user' && !m.pending && ' · ✓✓'}</p>
            </div>
          </motion.div>
        ))}
        {typing && <div className="flex gap-2 items-end"><img src={a.photo} className="h-7 w-7 rounded-full object-cover" alt="" /><div className="bg-white border border-line rounded-3xl rounded-bl-md px-4 py-3 flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="typing-dot h-2 w-2 rounded-full bg-rose" style={{ animationDelay: `${i * 0.15}s` }} />)}</div></div>}
        <div ref={endRef} />
      </div>
      {active ? (
        <div className="border-t border-line bg-pearl/95 p-3 safe-bottom">
          {!compact && visible.filter((m) => m.sender === 'user').length === 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-2">{['When will I get married?', 'How will my career grow this year?', 'Is this relationship right for me?', 'Any remedies for stress?'].map((q) => <button key={q} onClick={() => setText(q)} className="chip shrink-0 hover:border-rose">{q}</button>)}</div>
          )}
          {recording ? (
            <div className="flex items-center gap-3 rounded-full bg-blush/60 px-4 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-danger animate-pulse" /><span className="text-sm font-medium flex-1">Recording… {fmtDuration(recSec)}</span>
              <button onClick={() => { cancelRec.current = true; recRef.current?.stop(); }} className="h-9 w-9 rounded-full hover:bg-white flex items-center justify-center text-muted" aria-label="Cancel"><Trash2 className="h-4 w-4" /></button>
              <button onClick={() => recRef.current?.stop()} className="h-10 w-10 rounded-full bg-rose-grad text-white flex items-center justify-center" aria-label="Send voice"><Send className="h-4 w-4" /></button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
              <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder="Type your question…" className="input !rounded-3xl resize-none max-h-32 !py-2.5" />
              {text.trim() ? <button disabled={sending} className="h-11 w-11 shrink-0 rounded-full bg-rose-grad text-white flex items-center justify-center shadow-rose" aria-label="Send"><Send className="h-4 w-4" /></button> :
                <button type="button" onClick={startRec} className="h-11 w-11 shrink-0 rounded-full bg-plum text-white flex items-center justify-center" aria-label="Record voice message"><Mic className="h-4 w-4" /></button>}
            </form>
          )}
        </div>
      ) : <div className="border-t border-line p-4 text-center text-sm text-muted bg-cream/50">This consultation has ended · transcript saved</div>}
    </div>
  );

  const BillingPanel = (
    <div className="space-y-4">
      <div className="card p-5 text-center">
        <div className="relative mx-auto w-fit"><img src={a.photo} className="h-24 w-24 rounded-3xl object-cover ring-4 ring-gold-light/60" alt="" /><span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-4 ring-pearl ${a.is_online ? 'bg-emerald-500' : 'bg-stone-300'}`} /></div>
        <p className="font-serif text-xl font-semibold mt-3 flex items-center justify-center gap-1">{a.name}{a.verified && <Verified />}</p>
        <p className="text-xs text-muted">{a.title}</p>
        <StatusPill online={a.is_online} className="mt-2" />
      </div>
      <div className="card p-5 space-y-3 text-sm">
        <div className="flex items-center justify-between"><span className="text-muted flex items-center gap-1.5"><Clock className="h-4 w-4 text-gold" /> Duration</span><span className="font-mono text-lg font-semibold text-plum">{connectedMs || !active ? fmtDuration(elapsed) : 'Waiting…'}</span></div>
        <div className="flex items-center justify-between"><span className="text-muted">Rate</span><span className="font-medium">{st.prepaid ? 'Prepaid booking' : `${inr(st.rate)}/min`}</span></div>
        {!st.prepaid && <div className="flex items-center justify-between"><span className="text-muted">Billed ({st.minutes} min)</span><span className="font-semibold text-rose-deep">{inr(st.amount)}</span></div>}
        <div className="flex items-center justify-between"><span className="text-muted flex items-center gap-1.5"><Wallet className="h-4 w-4 text-gold" /> Wallet</span><span className="font-medium">{inr(st.balance)}</span></div>
        {active && remainingSec !== null && <div className="flex items-center justify-between"><span className="text-muted">Time left</span><span className={`font-mono font-medium ${low ? 'text-danger' : ''}`}>{fmtDuration(remainingSec)}</span></div>}
        <p className="text-[11px] text-muted leading-relaxed">Charged per started minute by our server{isCall ? ' — only while both of you are connected' : ''}. You never pay for time after you end.</p>
      </div>
      {active && !st.prepaid && <button onClick={() => setRecharge(true)} className="btn btn-outline w-full"><Wallet className="h-4 w-4" /> Add money</button>}
      {active && <button onClick={() => setConfirmEnd(true)} disabled={ending} className="btn btn-danger w-full"><PhoneOff className="h-4 w-4" /> {ending ? 'Ending…' : 'End consultation'}</button>}
      {!active && <Link to="/dashboard" className="btn btn-plum w-full">Back to dashboard</Link>}
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-ivory">
      <header className="shrink-0 flex items-center gap-3 px-3 sm:px-5 h-16 border-b border-line bg-pearl/95 backdrop-blur">
        <button onClick={() => (active ? setConfirmEnd(true) : nav('/dashboard'))} className="h-10 w-10 rounded-full hover:bg-cream flex items-center justify-center" aria-label="Back"><ChevronLeft className="h-5 w-5" /></button>
        <img src={a.photo} className="h-10 w-10 rounded-full object-cover" alt="" />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate flex items-center gap-1">{a.name}{a.verified && <Verified className="h-3.5 w-3.5" />}</p>
          <p className="text-xs text-muted flex items-center gap-1.5">{active ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{typing ? 'typing…' : `${M.label} · ${connectedMs ? 'live' : 'connecting'}`}</> : 'Consultation ended'}</p>
        </div>
        <div className="text-right lg:hidden"><p className="font-mono text-sm font-semibold text-plum">{fmtDuration(elapsed)}</p><p className={`text-[11px] ${low ? 'text-danger' : 'text-muted'}`}>{st.prepaid ? 'Prepaid' : inr(st.balance)}</p></div>
        {active && <button onClick={() => setConfirmEnd(true)} className="btn btn-danger btn-sm lg:hidden !px-3" aria-label="End"><PhoneOff className="h-4 w-4" /></button>}
      </header>
      {low && !st.prepaid && (
        <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-warn shrink-0" /><span className="flex-1 text-amber-800">Low balance — about <b>{Math.floor((remainingSec || 0) / 60)} min {Math.floor((remainingSec || 0) % 60)}s</b> left.</span>
          <button onClick={() => setRecharge(true)} className="btn btn-rose btn-sm">Recharge</button>
        </div>
      )}

      <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_320px]">
        <div className="min-h-0 flex flex-col relative">
          {!isCall ? renderChat() : (
            <div className="relative flex-1 min-h-0 overflow-hidden bg-plum-deep">
              {active ? (
                <CallRoom video={c.mode === 'video'} peerName={a.name} peerPhoto={a.photo} ending={ending} onEnd={() => setConfirmEnd(true)}
                  getToken={() => api('/api/consultations', { method: 'POST', body: { action: 'call_token', consultation_id: Number(id) } })}>
                  <button onClick={() => setChatOpen(true)} className="absolute top-4 left-4 btn btn-white btn-sm"><MessageCircle className="h-4 w-4" /> Chat</button>
                </CallRoom>
              ) : (
                <div className="absolute inset-0 bg-plum-grad flex flex-col items-center justify-center text-white">
                  <img src={a.photo} className="h-32 w-32 rounded-full object-cover grayscale opacity-80" alt="" />
                  <p className="font-serif text-2xl mt-6">Call ended</p>
                  <button onClick={() => setChatOpen(true)} className="btn btn-white mt-6"><MessageCircle className="h-4 w-4" /> View messages</button>
                </div>
              )}
              <AnimatePresence>
                {chatOpen && (
                  <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute inset-y-0 right-0 w-full sm:w-96 bg-ivory flex flex-col shadow-2xl z-10">
                    <div className="h-12 flex items-center justify-between px-4 border-b border-line"><span className="font-medium">In-call chat</span><button onClick={() => setChatOpen(false)} className="h-8 w-8 rounded-full hover:bg-cream flex items-center justify-center"><X className="h-4 w-4" /></button></div>
                    {renderChat(true)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        <aside className="hidden lg:block border-l border-line p-5 overflow-y-auto bg-pearl/50">{BillingPanel}</aside>
      </div>

      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} title="End consultation?" size="sm">
        <p className="text-sm text-muted">You’ve been connected for <b className="text-ink">{fmtDuration(elapsed)}</b>.{!st.prepaid && <> So far <b className="text-rose-deep">{inr(st.amount)}</b> has been charged ({st.minutes} started minute{st.minutes === 1 ? '' : 's'}). Nothing more will be charged after you end.</>}</p>
        <div className="grid grid-cols-2 gap-2 mt-6"><button onClick={() => setConfirmEnd(false)} className="btn btn-outline">Continue</button><button onClick={end} disabled={ending} className="btn btn-danger">{ending ? 'Ending…' : 'End now'}</button></div>
      </Modal>

      <Modal open={recharge} onClose={() => setRecharge(false)} title="Quick recharge" size="sm">
        <p className="text-sm text-muted mb-4">Top up without leaving your session.</p>
        <div className="grid grid-cols-2 gap-2 mb-4">{[100, 200, 500, 1000].map((v) => <button key={v} onClick={() => setRAmount(v)} className={`rounded-2xl border p-3 transition ${rAmount === v ? 'border-rose bg-blush/50' : 'border-line hover:border-gold-light'}`}><p className="font-serif text-xl font-semibold">{inr(v)}</p><p className="text-xs text-muted">≈ {st.rate ? Math.floor(v / st.rate) : 0} min</p></button>)}</div>
        <RechargeButtons amount={rAmount} compact onDone={(b) => { if (b !== undefined) setSt((s: any) => ({ ...s, balance: b })); setRecharge(false); }} />
      </Modal>

      <Modal open={!!summary} onClose={() => setSummary(null)} title="Consultation summary">
        {summary && (
          <div>
            <div className="flex items-center gap-3 rounded-2xl bg-cream/60 p-4"><img src={a.photo} className="h-12 w-12 rounded-xl object-cover" alt="" /><div><p className="font-medium">{a.name}</p><p className="text-xs text-muted">{M.label}</p></div><CheckCircle2 className="h-6 w-6 text-success ml-auto" /></div>
            {summary.reason && END_TEXT[summary.reason] && <p className="text-sm text-muted mt-3">{END_TEXT[summary.reason]}</p>}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Duration</span><b>{fmtDuration(summary.seconds || 0)} ({summary.minutes} min billed)</b></div>
              <div className="flex justify-between"><span className="text-muted">Rate</span><b>{summary.prepaid ? 'Prepaid booking' : `${inr(summary.rate)}/min`}</b></div>
              <div className="flex justify-between text-base"><span>Amount charged</span><b className="text-rose-deep">{inr(summary.amount)}</b></div>
              <div className="flex justify-between"><span className="text-muted">Wallet balance</span><b>{inr(summary.balance)}</b></div>
            </div>
            <div className="mt-6 pt-5 border-t border-line">
              {!summary.minutes ? null : rated ? <div className="text-center py-4"><Sparkles className="h-8 w-8 text-gold mx-auto" /><p className="font-serif text-xl mt-2">Thank you for your review</p></div> : (
                <>
                  <p className="font-serif text-xl font-semibold text-plum text-center">How was your session?</p>
                  <div className="flex justify-center gap-1.5 mt-3">{[1, 2, 3, 4, 5].map((s) => <button key={s} onClick={() => setRating(s)} aria-label={`${s} stars`}><Star className={`h-9 w-9 transition hover:scale-110 ${s <= rating ? 'fill-gold text-gold' : 'text-gold-light'}`} /></button>)}</div>
                  <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3} className="input mt-4" placeholder="Share a few words about your experience (optional)" />
                  <button onClick={submitRating} className="btn btn-rose w-full mt-3">Submit rating</button>
                </>
              )}
              <div className="grid grid-cols-2 gap-2 mt-3"><Link to={`/astrologer/${a.slug}`} className="btn btn-outline btn-sm">View profile</Link><Link to="/dashboard" className="btn btn-plum btn-sm">Dashboard</Link></div>
            </div>
          </div>
        )}
      </Modal>

      {!active && !summary && !rated && st.minutes > 0 && (
        <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-96 z-30 lg:right-[340px]">
          <div className="card gold-border p-4 flex items-center gap-3 shadow-lux"><Star className="h-6 w-6 text-gold fill-gold shrink-0" /><p className="text-sm flex-1">Rate your session with {a.name.split(' ')[0]}</p><button onClick={() => setSummary({ minutes: st.minutes, seconds: st.duration_sec, rate: st.rate, amount: st.amount, balance: st.balance, prepaid: st.prepaid })} className="btn btn-rose btn-sm">Rate</button></div>
        </div>
      )}
    </div>
  );
}
