import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import supabase from '../lib/supabase';
import { api } from '../lib/api';

export type Role = 'customer' | 'astrologer' | 'admin';
export const homeFor = (role?: Role | null) => (role === 'admin' ? '/admin' : role === 'astrologer' ? '/astro-panel' : '/dashboard');

interface AuthState {
  user: any;
  session: any;
  profile: any;
  role: Role | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  setBalance: (n: number) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({ user: null, session: null, profile: null, role: null, loading: true, refreshProfile: async () => {}, setBalance: () => {}, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    try { setProfile(await api('/api/me?section=profile')); } catch { setProfile(null); }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setUser(session?.user ?? null); setSessionLoading(false); }).catch(() => setSessionLoading(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setUser(s?.user ?? null); setSessionLoading(false); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) { setProfile(null); return; }
    setProfileLoading(true);
    refreshProfile().finally(() => setProfileLoading(false));
  }, [user?.id, refreshProfile]);

  const setBalance = (n: number) => setProfile((p: any) => (p ? { ...p, wallet_balance: n } : p));
  const signOut = async () => { await supabase.auth.signOut(); setProfile(null); };
  const loading = sessionLoading || (!!user && (profileLoading || !profile));
  const role: Role | null = profile?.role || null;

  return <AuthContext.Provider value={{ user, session, profile, role, loading, refreshProfile, setBalance, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
