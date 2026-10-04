import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
const Ctx = createContext<{ toast: (msg: string, kind?: Kind) => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; kind: Kind }[]>([]);
  const toast = useCallback((msg: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4200);
  }, []);
  const Icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  const color = { success: 'text-success', error: 'text-danger', info: 'text-gold-deep' };
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {items.map((t) => {
            const I = Icon[t.kind];
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
                className="pointer-events-auto card gold-border px-4 py-3 flex items-start gap-3 w-full sm:w-96 shadow-lux">
                <I className={`h-5 w-5 mt-0.5 shrink-0 ${color[t.kind]}`} />
                <p className="text-sm flex-1">{t.msg}</p>
                <button onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))} className="text-muted hover:text-ink" aria-label="Dismiss"><X className="h-4 w-4" /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
