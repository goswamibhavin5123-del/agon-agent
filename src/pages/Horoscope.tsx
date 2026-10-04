import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Briefcase, Wallet, Activity, Sparkles, Palette, Hash, Clock, Smile, Users, MessageCircle } from 'lucide-react';
import { useApi } from '../lib/api';
import { SIGNS, g } from '../lib/zodiac';
import { Tabs, Skeleton, ErrorState, EmptyState } from '../components/ui';
import { StarField, ZodiacWheel } from '../components/Celestial';

const PERIODS = [{ key: 'daily', label: 'Daily' }, { key: 'weekly', label: 'Weekly' }, { key: 'monthly', label: 'Monthly' }, { key: 'yearly', label: 'Yearly' }];

export default function Horoscope({ embedded = false, defaultSign }: { embedded?: boolean; defaultSign?: string }) {
  const params = useParams();
  const nav = useNavigate();
  const [sign, setSign] = useState<string>(params.sign || defaultSign || 'aries');
  const [period, setPeriod] = useState('daily');
  useEffect(() => { if (params.sign) setSign(params.sign); }, [params.sign]);
  const { data, loading, error, reload } = useApi<any[]>(`/api/content?type=horoscopes&sign=${sign}`, [sign]);
  const h = (data || []).find((x) => x.period === period);
  const info = SIGNS.find((s) => s.key === sign) || SIGNS[0];
  const pick = (k: string) => { setSign(k); if (!embedded) nav(`/horoscope/${k}`, { replace: true }); };

  const areas = h ? [
    { icon: Heart, label: 'Love & Relationships', text: h.love, score: h.love_score, tone: 'bg-rose-grad' },
    { icon: Briefcase, label: 'Career', text: h.career, score: h.career_score, tone: 'bg-plum' },
    { icon: Wallet, label: 'Finance', text: h.finance, score: h.finance_score, tone: 'bg-gold-grad' },
    { icon: Activity, label: 'Health', text: h.health, score: h.health_score, tone: 'bg-emerald-500' },
  ] : [];

  return (
    <div>
      {!embedded && (
        <section className="relative bg-plum-grad overflow-hidden">
          <StarField count={60} seed={31} color="#E8CD8A" />
          <ZodiacWheel className="absolute -left-32 -bottom-40 w-[480px] opacity-20 animate-spin-slow" stroke="#E8CD8A" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 text-center">
            <p className="text-[11px] tracking-[0.35em] uppercase text-gold-light font-medium">Horoscope</p>
            <h1 className="font-display text-4xl sm:text-5xl text-white mt-3">What the <span className="font-serif italic font-medium text-gold-grad">stars</span> hold</h1>
            <p className="text-white/60 mt-3">Daily, weekly, monthly and yearly guidance for all 12 signs.</p>
          </div>
        </section>
      )}
      <div className={embedded ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 py-8'}>
        <div className={`grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 ${embedded ? '' : '-mt-16 relative z-10'}`}>
          {SIGNS.map((s) => (
            <button key={s.key} onClick={() => pick(s.key)} className={`rounded-2xl p-2.5 sm:p-3 text-center transition border ${sign === s.key ? 'bg-pearl border-gold shadow-lux -translate-y-1' : 'bg-pearl/90 border-line hover:border-gold-light'}`}>
              <span className={`block text-2xl sm:text-3xl font-serif ${sign === s.key ? 'text-gold-grad' : 'text-rosegold'}`}>{g(s.glyph)}</span>
              <span className={`block text-[10px] sm:text-[11px] mt-1 ${sign === s.key ? 'text-plum font-medium' : 'text-muted'}`}>{s.name}</span>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6 mt-8">
          <aside className="card gold-border p-6 text-center h-fit lg:sticky lg:top-24">
            <div className="relative mx-auto h-36 w-36">
              <ZodiacWheel className="absolute inset-0 animate-spin-slow" />
              <span className="absolute inset-6 rounded-full bg-plum-grad flex items-center justify-center text-5xl text-gold-light font-serif shadow-lux">{g(info.glyph)}</span>
            </div>
            <h2 className="font-display text-3xl text-plum mt-4">{info.name}</h2>
            <p className="font-serif italic text-muted">{info.hindi} Rashi</p>
            <p className="text-sm text-muted mt-1">{info.dates}</p>
            <div className="grid grid-cols-2 gap-2 mt-5 text-sm">
              <div className="rounded-2xl bg-cream/70 p-3"><p className="text-[10px] uppercase tracking-wider text-muted">Element</p><p className="font-medium">{info.element}</p></div>
              <div className="rounded-2xl bg-cream/70 p-3"><p className="text-[10px] uppercase tracking-wider text-muted">Ruler</p><p className="font-medium">{info.ruler}</p></div>
            </div>
            <div className="mt-5 rounded-2xl bg-blush/50 p-4 text-left">
              <p className="font-serif text-lg text-plum font-semibold">Want a personal reading?</p>
              <p className="text-xs text-muted mt-1">Sun-sign forecasts are general. An astrologer can read your full birth chart.</p>
              <Link to="/astrologers" className="btn btn-rose btn-sm w-full mt-3"><MessageCircle className="h-4 w-4" /> Consult an astrologer</Link>
            </div>
          </aside>

          <div className="min-w-0">
            <Tabs tabs={PERIODS} value={period} onChange={setPeriod} className="w-fit" />
            {error ? <div className="mt-6"><ErrorState message={error} onRetry={() => reload()} /></div> : loading ? (
              <div className="space-y-4 mt-6"><Skeleton className="h-40" /><div className="grid sm:grid-cols-2 gap-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div></div>
            ) : !h ? (
              <div className="card mt-6"><EmptyState title="Forecast coming soon" text="Our astrologers are preparing this reading." /></div>
            ) : (
              <motion.div key={`${sign}-${period}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 mt-6">
                <div className="card p-6 sm:p-8 relative overflow-hidden">
                  <Sparkles className="absolute right-6 top-6 h-8 w-8 text-gold-light" />
                  <p className="text-[11px] uppercase tracking-[0.25em] text-gold-deep">{period} overview</p>
                  <p className="font-serif text-xl sm:text-2xl leading-relaxed text-ink mt-3">{h.overview}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {areas.map((a) => (
                    <div key={a.label} className="card p-5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium text-plum"><a.icon className="h-5 w-5 text-rose-deep" />{a.label}</span>
                        <span className="font-serif text-xl font-semibold">{a.score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-cream mt-3 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${a.score}%` }} transition={{ duration: 0.9 }} className={`h-full rounded-full ${a.tone}`} /></div>
                      <p className="text-sm text-ink/75 mt-3 leading-relaxed">{a.text}</p>
                    </div>
                  ))}
                </div>
                <div className="card gold-border p-6">
                  <h3 className="font-display text-sm tracking-[0.2em] text-plum mb-4">LUCKY DETAILS</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { i: Hash, l: 'Number', v: h.lucky_number },
                      { i: Palette, l: 'Colour', v: h.lucky_color },
                      { i: Clock, l: 'Time', v: h.lucky_time },
                      { i: Smile, l: 'Mood', v: h.mood },
                      { i: Users, l: 'Compatible', v: h.compatibility },
                    ].map((x) => (
                      <div key={x.l} className="rounded-2xl bg-cream/60 p-4 text-center"><x.i className="h-5 w-5 mx-auto text-gold" /><p className="text-[10px] uppercase tracking-wider text-muted mt-2">{x.l}</p><p className="font-medium text-sm mt-0.5">{x.v}</p></div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.75rem] bg-plum-grad p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden">
                  <StarField count={20} seed={4} color="#E8CD8A" />
                  <div className="relative flex-1 text-center sm:text-left"><h3 className="font-serif text-2xl">Go beyond your sun sign</h3><p className="text-white/65 text-sm mt-1">Get guidance on {info.name} matters from a verified Vedic astrologer.</p></div>
                  <Link to="/astrologers" className="relative btn btn-gold">Talk to an astrologer</Link>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
