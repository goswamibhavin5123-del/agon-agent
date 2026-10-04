import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, SlidersHorizontal, X, Users, Wifi } from 'lucide-react';
import { useApi } from '../lib/api';
import AstrologerCard, { AstrologerCardSkeleton } from '../components/AstrologerCard';
import { EmptyState, ErrorState } from '../components/ui';
import { StarField } from '../components/Celestial';

export const EXPERTISE = ['Vedic Astrology', 'Love & Relationships', 'Career & Business', 'Marriage', 'Tarot Reading', 'Numerology', 'Vastu', 'Palmistry', 'Kundli Matching', 'Health', 'Finance', 'Remedies'];
export const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Kannada', 'Malayalam'];

export default function Astrologers({ embedded = false }: { embedded?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [debounced, setDebounced] = useState(q);
  const [expertise, setExpertise] = useState<string[]>(params.get('expertise') ? [params.get('expertise')!] : []);
  const [languages, setLanguages] = useState<string[]>([]);
  const [online, setOnline] = useState(params.get('online') === 'true');
  const [gender, setGender] = useState('');
  const [maxPrice, setMaxPrice] = useState(200);
  const [minExp, setMinExp] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('recommended');
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    if (embedded) return;
    const p = new URLSearchParams();
    if (debounced) p.set('q', debounced);
    if (online) p.set('online', 'true');
    if (expertise.length === 1) p.set('expertise', expertise[0]);
    const mode = params.get('mode');
    if (mode) p.set('mode', mode);
    setParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, online, expertise]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ sort });
    if (debounced) p.set('q', debounced);
    if (online) p.set('online', 'true');
    if (expertise.length) p.set('expertise', expertise.join(','));
    if (languages.length) p.set('language', languages.join(','));
    if (gender) p.set('gender', gender);
    if (maxPrice < 200) p.set('max_price', String(maxPrice));
    if (minExp) p.set('min_exp', String(minExp));
    if (minRating) p.set('min_rating', String(minRating));
    return `/api/astrologers?${p.toString()}`;
  }, [debounced, online, expertise, languages, gender, maxPrice, minExp, minRating, sort]);

  const { data, loading, error, reload } = useApi<any[]>(query);
  const list = data || [];
  const toggle = (arr: string[], set: (x: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const activeCount = expertise.length + languages.length + (online ? 1 : 0) + (gender ? 1 : 0) + (maxPrice < 200 ? 1 : 0) + (minExp ? 1 : 0) + (minRating ? 1 : 0);
  const clear = () => { setExpertise([]); setLanguages([]); setOnline(false); setGender(''); setMaxPrice(200); setMinExp(0); setMinRating(0); };
  const mode = params.get('mode');

  const Filters = (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-[0.2em] text-plum">FILTERS</h3>
        {activeCount > 0 && <button onClick={clear} className="text-xs text-rose-deep hover:underline">Clear all ({activeCount})</button>}
      </div>
      <label className="flex items-center justify-between rounded-2xl bg-emerald-50/70 border border-emerald-100 px-4 py-3 cursor-pointer">
        <span className="flex items-center gap-2 text-sm font-medium text-emerald-800"><Wifi className="h-4 w-4" /> Online now</span>
        <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
      </label>
      <div>
        <p className="label">Expertise</p>
        <div className="flex flex-wrap gap-1.5">{EXPERTISE.map((e) => <button key={e} onClick={() => toggle(expertise, setExpertise, e)} className={`chip ${expertise.includes(e) ? 'chip-active' : 'hover:border-gold'}`}>{e}</button>)}</div>
      </div>
      <div>
        <p className="label">Languages</p>
        <div className="flex flex-wrap gap-1.5">{LANGUAGES.map((l) => <button key={l} onClick={() => toggle(languages, setLanguages, l)} className={`chip ${languages.includes(l) ? 'chip-active' : 'hover:border-gold'}`}>{l}</button>)}</div>
      </div>
      <div>
        <div className="flex justify-between"><p className="label">Max chat price</p><span className="text-sm font-medium text-rose-deep">{maxPrice >= 200 ? 'Any' : `₹${maxPrice}/min`}</span></div>
        <input type="range" min={10} max={200} step={5} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#D9678A]" />
      </div>
      <div>
        <p className="label">Experience</p>
        <div className="grid grid-cols-4 gap-1.5">{[0, 5, 10, 15].map((y) => <button key={y} onClick={() => setMinExp(y)} className={`chip justify-center ${minExp === y ? 'chip-active' : ''}`}>{y ? `${y}+ y` : 'Any'}</button>)}</div>
      </div>
      <div>
        <p className="label">Rating</p>
        <div className="grid grid-cols-4 gap-1.5">{[0, 4, 4.5, 4.8].map((r) => <button key={r} onClick={() => setMinRating(r)} className={`chip justify-center ${minRating === r ? 'chip-active' : ''}`}>{r ? `${r}★+` : 'Any'}</button>)}</div>
      </div>
      <div>
        <p className="label">Gender</p>
        <div className="grid grid-cols-3 gap-1.5">{[['', 'Any'], ['female', 'Female'], ['male', 'Male']].map(([v, l]) => <button key={v} onClick={() => setGender(v)} className={`chip justify-center ${gender === v ? 'chip-active' : ''}`}>{l}</button>)}</div>
      </div>
    </div>
  );

  return (
    <div>
      {!embedded && (
        <section className="relative bg-celestial overflow-hidden">
          <StarField count={30} seed={9} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 text-center">
            <p className="text-[11px] tracking-[0.35em] uppercase text-gold-deep font-medium">Astrologer marketplace</p>
            <h1 className="font-display text-4xl sm:text-5xl text-plum mt-3">Consult the <span className="font-serif italic font-medium text-rose-grad">right</span> expert</h1>
            <p className="text-muted mt-3">{mode ? `Showing experts available for ${mode === 'audio' ? 'voice calls' : 'video calls'}.` : 'Chat, call or video with verified astrologers — billed by the minute.'}</p>
          </div>
        </section>
      )}
      <div className={`${embedded ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 py-8'}`}>
        <div className={`${embedded ? '' : 'sticky top-[72px] z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 bg-ivory/85 backdrop-blur-xl'}`}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, expertise or language…" className="input !rounded-full !pl-11 !py-3 shadow-sm" />
              {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-cream flex items-center justify-center"><X className="h-4 w-4" /></button>}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input !w-auto !rounded-full hidden sm:block">
              <option value="recommended">Recommended</option><option value="rating">Top rated</option><option value="orders">Most consulted</option>
              <option value="experience">Most experienced</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option>
            </select>
            <button onClick={() => setDrawer(true)} className="btn btn-outline lg:hidden !px-4 relative"><SlidersHorizontal className="h-4 w-4" />{activeCount > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose text-white text-[10px] flex items-center justify-center">{activeCount}</span>}</button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none mt-3">
            <button onClick={() => setOnline(!online)} className={`chip shrink-0 ${online ? 'chip-active' : ''}`}><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Online</button>
            {EXPERTISE.slice(0, 8).map((e) => <button key={e} onClick={() => toggle(expertise, setExpertise, e)} className={`chip shrink-0 ${expertise.includes(e) ? 'chip-active' : ''}`}>{e}</button>)}
          </div>
        </div>

        <div className="grid lg:grid-cols-[270px_1fr] gap-8 mt-4">
          <aside className="hidden lg:block"><div className={`card p-6 sticky ${embedded ? 'top-24' : 'top-[200px]'}`}>{Filters}</div></aside>
          <div>
            <div className="flex items-center justify-between mb-4 text-sm">
              <p className="text-muted"><Users className="inline h-4 w-4 mr-1 text-gold" />{loading ? 'Finding astrologers…' : `${list.length} astrologer${list.length === 1 ? '' : 's'} · ${list.filter((a) => a.is_online).length} online`}</p>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="sm:hidden text-sm bg-transparent text-plum">
                <option value="recommended">Recommended</option><option value="rating">Top rated</option><option value="price_low">Price ↑</option><option value="price_high">Price ↓</option><option value="experience">Experience</option>
              </select>
            </div>
            {error ? <ErrorState message={error} onRetry={() => reload()} /> : loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <AstrologerCardSkeleton key={i} />)}</div>
            ) : list.length === 0 ? (
              <div className="card"><EmptyState icon={Search} title="No astrologers match" text="Try removing a filter or searching a different expertise." action={<button onClick={() => { clear(); setQ(''); }} className="btn btn-rose btn-sm">Reset filters</button>} /></div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{list.map((a, i) => <AstrologerCard key={a.id} a={a} index={i} />)}</div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-[75] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-plum-deep/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute bottom-0 inset-x-0 max-h-[88vh] overflow-y-auto bg-pearl rounded-t-[2rem] p-6 pb-28">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-line mb-5" />
              {Filters}
              <div className="fixed bottom-0 inset-x-0 p-4 bg-pearl border-t border-line flex gap-2 safe-bottom">
                <button onClick={clear} className="btn btn-outline flex-1">Clear</button>
                <button onClick={() => setDrawer(false)} className="btn btn-rose flex-[2]">Show {list.length} results</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
