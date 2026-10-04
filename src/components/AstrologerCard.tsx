import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Phone, Video, Languages, Briefcase, Star } from 'lucide-react';
import { Verified, StatusPill } from './ui';
import { inr } from '../lib/format';
import { useConsult } from '../contexts/ConsultContext';
import { useFavorites } from '../contexts/FavoritesContext';

export default function AstrologerCard({ a, index = 0 }: { a: any; index?: number }) {
  const { start } = useConsult();
  const { isFav, toggle } = useFavorites();
  const fav = isFav(a.id);
  return (
    <motion.article initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (index % 4) * 0.06 }}
      className="card card-hover p-4 flex flex-col group">
      <div className="flex gap-4">
        <Link to={`/astrologer/${a.slug}`} className="relative shrink-0">
          <div className={`rounded-[1.25rem] p-[2px] ${a.is_online ? 'bg-gold-grad' : 'bg-line'}`}>
            <img src={a.photo} alt={a.name} loading="lazy" className="h-24 w-24 rounded-[1.1rem] object-cover bg-cream" />
          </div>
          <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-pearl ${a.is_online ? 'bg-emerald-500' : 'bg-stone-300'}`} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/astrologer/${a.slug}`} className="min-w-0">
              <h3 className="font-serif text-[1.3rem] leading-tight font-semibold text-plum flex items-center gap-1.5"><span className="truncate">{a.name}</span>{a.verified && <Verified />}</h3>
              <p className="text-xs text-muted truncate mt-0.5">{a.title}</p>
            </Link>
            <button onClick={() => toggle(a.id, a.name)} aria-label="Favourite" className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition ${fav ? 'bg-blush text-rose-deep' : 'hover:bg-cream text-muted'}`}>
              <Heart className={`h-4 w-4 ${fav ? 'fill-rose' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-gold-deep"><Star className="h-3.5 w-3.5 fill-gold text-gold" />{Number(a.rating).toFixed(1)}</span>
            <span className="text-muted">· {Number(a.orders_count).toLocaleString('en-IN')} consults</span>
          </div>
          <div className="mt-1.5 space-y-0.5 text-xs text-ink/70">
            <p className="flex items-center gap-1.5 truncate"><Languages className="h-3.5 w-3.5 text-gold shrink-0" /><span className="truncate">{(a.languages || []).join(', ')}</span></p>
            <p className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-gold shrink-0" />{a.experience} yrs experience</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {(a.expertise || []).slice(0, 3).map((e: string) => <span key={e} className="chip chip-gold !text-[11px] !py-0.5">{e}</span>)}
      </div>
      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted">From</p>
          <p className="font-semibold text-rose-deep">{inr(a.chat_price)}<span className="text-xs text-muted font-normal">/min</span></p>
        </div>
        <StatusPill online={a.is_online} className="sm:hidden xl:inline-flex" />
        <div className="flex gap-1.5">
          <button onClick={() => start(a, 'chat')} className="btn btn-rose btn-sm !px-3" title={`Chat · ${inr(a.chat_price)}/min`}><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">Chat</span></button>
          <button onClick={() => start(a, 'audio')} className="btn btn-outline btn-sm !px-2.5" title={`Call · ${inr(a.call_price)}/min`} aria-label="Audio call"><Phone className="h-4 w-4" /></button>
          <button onClick={() => start(a, 'video')} className="btn btn-outline btn-sm !px-2.5" title={`Video · ${inr(a.video_price)}/min`} aria-label="Video call"><Video className="h-4 w-4" /></button>
        </div>
      </div>
    </motion.article>
  );
}

export function AstrologerCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex gap-4"><div className="skeleton h-24 w-24 rounded-[1.1rem]" /><div className="flex-1 space-y-2"><div className="skeleton h-5 w-3/4" /><div className="skeleton h-3 w-1/2" /><div className="skeleton h-3 w-2/3" /><div className="skeleton h-3 w-1/3" /></div></div>
      <div className="skeleton h-9 w-full mt-5 rounded-full" />
    </div>
  );
}

export function MiniAstroCard({ a }: { a: any }) {
  const { start } = useConsult();
  return (
    <div className="card card-hover p-4 w-44 shrink-0 text-center flex flex-col items-center">
      <Link to={`/astrologer/${a.slug}`} className="relative">
        <span className="absolute inset-0 rounded-full border-2 border-emerald-400/60 animate-pulse-ring" />
        <img src={a.photo} alt={a.name} className="relative h-20 w-20 rounded-full object-cover ring-[3px] ring-gold-light" loading="lazy" />
        <span className="absolute bottom-0.5 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-pearl" />
      </Link>
      <Link to={`/astrologer/${a.slug}`} className="mt-3 font-serif text-lg font-semibold text-plum leading-tight flex items-center gap-1 justify-center"><span className="truncate max-w-[120px]">{a.name.split(' ')[0]} {a.name.split(' ')[1]?.[0]}.</span>{a.verified && <Verified className="h-3.5 w-3.5" />}</Link>
      <p className="text-[11px] text-muted truncate w-full">{a.expertise?.[0]}</p>
      <p className="text-xs mt-1 text-gold-deep flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{Number(a.rating).toFixed(1)} · <span className="text-rose-deep font-medium">{inr(a.chat_price)}/min</span></p>
      <button onClick={() => start(a, 'chat')} className="btn btn-rose btn-sm w-full mt-3"><MessageCircle className="h-3.5 w-3.5" /> Chat</button>
    </div>
  );
}
