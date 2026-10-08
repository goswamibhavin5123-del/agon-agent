import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Sparkles, Eye, EyeOff } from 'lucide-react';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { useAuth, homeFor } from '../contexts/AuthContext';
import type { Role } from '../contexts/AuthContext';
import { api } from '../lib/api';

const DEMOS = [
  { label: 'Customer', email: 'demo@AstroRahu.com' },
  { label: 'Astrologer', email: 'astrologer@AstroRahu.com' },
  { label: 'Admin', email: 'admin@AstroRahu.com' },
];

/** Only follow ?next= when it is a same-site path the role is allowed to open. */
function safeNext(next: string | null, role: Role | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return homeFor(role);
  const areas: [string, Role][] = [['/dashboard', 'customer'], ['/consult', 'customer'], ['/book', 'customer'], ['/astro-panel', 'astrologer'], ['/admin', 'admin'], ['/launch-checklist', 'admin']];
  const hit = areas.find(([p]) => next.startsWith(p));
  if (hit && hit[1] !== role) return homeFor(role);
  return next;
}
import { useToast } from '../contexts/ToastContext';
import Brand, { LOGO } from '../components/Brand';
import { StarField } from '../components/Celestial';

export default function Login() {
  const [params] = useSearchParams();
  const next = params.get('next');
  const { user, loading, role } = useAuth();
  const [agree, setAgree] = useState(false);
  const { toast } = useToast();
  const nav = useNavigate();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  if (!loading && user && role) return <Navigate to={safeNext(next, role)} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (mode === 'up' && !name.trim()) er.name = 'Please enter your name';
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address';
    if (password.length < (mode === 'up' ? 8 : 6)) er.password = mode === 'up' ? 'Use at least 8 characters' : 'Password must be at least 6 characters';
    if (mode === 'up' && !agree) er.agree = 'Please confirm you are 18+ and accept the Terms and Privacy Policy';
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast('Welcome back ✨');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        if (!data.session) { toast('Check your inbox to confirm your email, then sign in.', 'info'); setMode('in'); return; }
        await api('/api/me', { method: 'POST', body: { action: 'consent', kinds: ['terms', 'privacy', 'age18'] } }).catch(() => {});
        toast('Account created — ₹250 welcome credit added!');
      }
      // Redirect happens once the role is loaded (see <Navigate> above).
    } catch (e: any) {
      setErr({ form: e.message || 'Authentication failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex bg-plum-grad overflow-hidden items-center justify-center p-12">
        <StarField count={70} seed={61} color="#E8CD8A" />
        <div className="relative text-center max-w-md">
          <div className="mx-auto h-80 w-80 rounded-full p-[3px] bg-gold-grad shadow-2xl"><img src={LOGO} alt="Astro Rahu" className="h-full w-full rounded-full object-cover" /></div>
          <h2 className="font-serif text-4xl text-white mt-10 italic">“The stars incline, they do not compel.”</h2>
          <p className="text-gold-light/80 mt-4 tracking-[0.3em] text-xs uppercase">Guided by stars · Empowered by you</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12 bg-celestial">
        <div className="w-full max-w-md">
          <Brand />
          <h1 className="font-display text-3xl text-plum mt-10">{mode === 'in' ? 'Welcome back' : 'Begin your journey'}</h1>
          <p className="text-muted mt-2">{mode === 'in' ? 'Sign in to continue your consultations.' : 'Create an account and receive ₹250 in wallet credit.'}</p>

          <div className="mt-6 rounded-2xl gold-border p-4 text-sm flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-gold shrink-0 mt-0.5" />
            <div className="flex-1"><p className="font-medium">Demo accounts</p><p className="text-muted text-xs mt-0.5">Password for all: password123</p>
              <div className="flex flex-wrap gap-1.5 mt-2">{DEMOS.map((d) => <button key={d.email} type="button" onClick={() => { setMode('in'); setEmail(d.email); setPassword('password123'); }} className="chip hover:border-gold">{d.label}</button>)}</div>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === 'up' && (
              <div><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" /><input className={`input !pl-11 !py-3 ${err.name ? 'input-error' : ''}`} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} /></div>{err.name && <p className="text-xs text-danger mt-1">{err.name}</p>}</div>
            )}
            <div><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" /><input type="email" autoComplete="email" className={`input !pl-11 !py-3 ${err.email ? 'input-error' : ''}`} placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} /></div>{err.email && <p className="text-xs text-danger mt-1">{err.email}</p>}</div>
            <div><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" /><input type={show ? 'text' : 'password'} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} className={`input !pl-11 !pr-11 !py-3 ${err.password ? 'input-error' : ''}`} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" aria-label="Toggle password">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{err.password && <p className="text-xs text-danger mt-1">{err.password}</p>}</div>
            {mode === 'up' && (
              <div><label className="flex items-start gap-2.5 text-xs text-muted cursor-pointer"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D9678A]" /><span>I am 18 or older and agree to the <a href="/legal/terms" target="_blank" className="text-rose-deep underline">Terms of Service</a> and <a href="/legal/privacy" target="_blank" className="text-rose-deep underline">Privacy Policy</a>, including processing of my birth details to provide consultations.</span></label>{err.agree && <p className="text-xs text-danger mt-1">{err.agree}</p>}</div>
            )}
            {err.form && <p className="text-sm text-danger bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">{err.form}</p>}
            <button disabled={busy} className="btn btn-rose btn-lg w-full">{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
          </form>
          <div className="flex items-center gap-3 my-6 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <button type="button" onClick={() => { if (!signInWithGoogle('Astro Rahu')) toast('Google sign-in is not configured for this deployment.', 'error'); }} className="btn btn-white w-full !py-3 border border-line">
            <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.07-1.1-.16-1.6H12z" /></svg>
            Continue with Google
          </button>
          <p className="text-sm text-center text-muted mt-6">{mode === 'in' ? 'New to Astro Rahu?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr({}); }} className="text-rose-deep font-medium hover:underline">{mode === 'in' ? 'Create an account' : 'Sign in'}</button></p>
          <p className="text-center mt-4"><Link to="/" className="text-xs text-muted hover:text-plum">← Back to home</Link></p>
        </div>
      </div>
    </div>
  );
}
