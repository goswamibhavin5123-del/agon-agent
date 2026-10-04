import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth, homeFor } from './contexts/AuthContext';
import type { Role } from './contexts/AuthContext';
import { api } from './lib/api';
import { Modal } from './components/ui';
import Legal from './pages/Legal';
import { ToastProvider } from './contexts/ToastContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { ConsultProvider } from './contexts/ConsultContext';
import SiteLayout from './components/SiteLayout';
import { PageLoader } from './components/ui';
import { ZodiacWheel } from './components/Celestial';
import Home from './pages/Home';
import Astrologers from './pages/Astrologers';
import AstrologerProfile from './pages/AstrologerProfile';
import Horoscope from './pages/Horoscope';
import Kundli from './pages/Kundli';
import { BlogList, BlogPost } from './pages/Blog';
import Login from './pages/Login';
import Booking from './pages/Booking';
import Consultation from './pages/Consultation';
import CustomerDashboard from './pages/dashboard/Customer';
import AstroPanel from './pages/astro/AstroPanel';
import Admin from './pages/admin/Admin';
import LaunchChecklist from './pages/LaunchChecklist';
import { handleGoogleRedirect } from './lib/googleAuth';

handleGoogleRedirect();

/** Route guard: unauthenticated → login; wrong role → 403. The API enforces the same rules independently. */
function RoleRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading, role, profile } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader label="Opening the gates…" />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (!role || !roles.includes(role) || profile?.status === 'suspended') return <Forbidden />;
  if (role === 'astrologer' && !profile?.astrologer) return <Forbidden message="Your account has the astrologer role but no astrologer profile is linked yet. Please contact rahu talk support." />;
  return <>{children}</>;
}

function Forbidden({ message }: { message?: string }) {
  const { role, profile } = useAuth();
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-celestial">
      <div className="card gold-border max-w-md w-full p-8 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center"><ShieldAlert className="h-7 w-7 text-danger" /></div>
        <p className="text-[11px] tracking-[0.3em] uppercase text-muted mt-5">Error 403</p>
        <h1 className="font-display text-3xl text-plum mt-1">Access denied</h1>
        <p className="text-sm text-muted mt-3">{message || (profile?.status === 'suspended' ? 'Your account is suspended. Please contact support.' : `This area isn’t available to your ${role || ''} account.`)}</p>
        <div className="flex justify-center gap-2 mt-6"><Link to={homeFor(role)} className="btn btn-rose">Go to my dashboard</Link><Link to="/" className="btn btn-outline">Home</Link></div>
      </div>
    </div>
  );
}

/** Records Terms / Privacy / 18+ consent for any signed-in user who hasn’t accepted the current version. */
function ConsentGate() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const open = !!user && !!profile && profile.terms_accepted === false;
  const accept = async () => { setBusy(true); try { await api('/api/me', { method: 'POST', body: { action: 'consent', kinds: ['terms', 'privacy', 'age18'] } }); await refreshProfile(); } finally { setBusy(false); } };
  return (
    <Modal open={open} onClose={() => {}} title="Before you continue" size="sm">
      <p className="text-sm text-muted">We’ve updated our policies. Please review and accept them to keep using rahu talk.</p>
      <label className="flex items-start gap-2.5 text-sm mt-4 cursor-pointer"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-[#D9678A]" /><span>I am 18 or older and agree to the <a href="/legal/terms" target="_blank" className="text-rose-deep underline">Terms of Service</a> and <a href="/legal/privacy" target="_blank" className="text-rose-deep underline">Privacy Policy</a>, including processing of my birth details to provide consultations.</span></label>
      <div className="grid grid-cols-2 gap-2 mt-6"><button onClick={() => signOut()} className="btn btn-outline">Sign out</button><button disabled={!checked || busy} onClick={accept} className="btn btn-rose">{busy ? 'Saving…' : 'Accept'}</button></div>
    </Modal>
  );
}

function NotFound() {
  return (
    <div className="relative max-w-xl mx-auto px-4 py-24 text-center">
      <ZodiacWheel className="mx-auto w-48 h-48 animate-spin-slow opacity-70" />
      <h1 className="font-display text-5xl text-plum mt-6">Lost in the cosmos</h1>
      <p className="text-muted mt-3">This page isn’t written in the stars. Let’s guide you back.</p>
      <div className="flex justify-center gap-2 mt-6"><Link to="/" className="btn btn-rose">Go home</Link><Link to="/astrologers" className="btn btn-outline">Find an astrologer</Link></div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <FavoritesProvider>
            <ConsultProvider>
              <Routes>
                <Route element={<SiteLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/astrologers" element={<Astrologers />} />
                  <Route path="/astrologer/:slug" element={<AstrologerProfile />} />
                  <Route path="/horoscope" element={<Horoscope />} />
                  <Route path="/horoscope/:sign" element={<Horoscope />} />
                  <Route path="/kundli" element={<Kundli />} />
                  <Route path="/blog" element={<BlogList />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/book/:slug" element={<RoleRoute roles={['customer']}><Booking /></RoleRoute>} />
                  <Route path="/launch-checklist" element={<RoleRoute roles={['admin']}><LaunchChecklist /></RoleRoute>} />
                  <Route path="/legal/:doc" element={<Legal />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="/login" element={<Login />} />
                <Route path="/consult/:id" element={<RoleRoute roles={['customer']}><Consultation /></RoleRoute>} />
                <Route path="/dashboard/*" element={<RoleRoute roles={['customer']}><CustomerDashboard /></RoleRoute>} />
                <Route path="/astro-panel/*" element={<RoleRoute roles={['astrologer']}><AstroPanel /></RoleRoute>} />
                <Route path="/admin/*" element={<RoleRoute roles={['admin']}><Admin /></RoleRoute>} />
              </Routes>
              <ConsentGate />
            </ConsultProvider>
          </FavoritesProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
