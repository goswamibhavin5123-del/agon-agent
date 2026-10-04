import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { api } from '../lib/api';

const Ctx = createContext<{ ids: number[]; toggle: (id: number, name?: string) => Promise<void>; isFav: (id: number) => boolean }>({ ids: [], toggle: async () => {}, isFav: () => false });

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    if (!user || role !== 'customer') { setIds([]); return; }
    api<number[]>('/api/me?section=favorite_ids').then(setIds).catch(() => setIds([]));
  }, [user?.id, role]);

  const toggle = useCallback(async (id: number, name?: string) => {
    if (!user) { toast('Sign in to save your favourite astrologers', 'info'); nav('/login'); return; }
    if (role !== 'customer') { toast('Favourites are available to customer accounts only', 'error'); return; }
    const was = ids.includes(id);
    setIds((x) => (was ? x.filter((i) => i !== id) : [...x, id]));
    try {
      await api('/api/me', { method: 'POST', body: { action: 'favorite', astrologer_id: id } });
      toast(was ? `Removed ${name || 'astrologer'} from favourites` : `${name || 'Astrologer'} added to favourites`, was ? 'info' : 'success');
    } catch (e: any) {
      setIds((x) => (was ? [...x, id] : x.filter((i) => i !== id)));
      toast(e.message, 'error');
    }
  }, [ids, user, role, toast, nav]);

  return <Ctx.Provider value={{ ids, toggle, isFav: (id) => ids.includes(id) }}>{children}</Ctx.Provider>;
}

export const useFavorites = () => useContext(Ctx);
