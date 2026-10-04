import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, Video, CalendarDays, Heart, Share2, Star, Languages, Briefcase, Users, GraduationCap, MapPin, Clock, ChevronLeft, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { useApi, api } from '../lib/api';
import { PageLoader, ErrorState, Verified, StatusPill, Stars, Tabs, EmptyState, Avatar } from '../components/ui';
import { inr, timeAgo, DAYS, DAY_LABEL, label12 } from '../lib/format';
import { useConsult } from '../contexts/ConsultContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import AstrologerCard from '../components/AstrologerCard';
import { StarField } from '../components/Celestial';
import { SERVICE_ICONS } from './Home';

export default function AstrologerProfile() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { data: a, loading, error, reload } = useApi<any>(`/api/astrologers?slug=${slug}`, [slug]);
  const services = useApi<any[]>('/api/content?type=services');
  const similar = useApi<any[]>('/api/astrologers?sort=rating&limit=5');
  const { start } = useConsult();
  const { isFav, toggle } = useFavorites();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('about');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [reviewErr, setReviewErr] = useState('');

  const breakdown = useMemo(() => {
    const r = a?.reviews || [];
    return [5, 4, 3, 2, 1].map((s) => ({ s, n: r.filter((x: any) => x.rating === s).length, pct: r.length ? (r.filter((x: any) => x.rating === s).length / r.length) * 100 : 0 }));
  }, [a]);

  if (loading) return <PageLoader label="Opening profile…" />;
  if (error || !a) return <div className="max-w-3xl mx-auto px-4 py-16"><ErrorState message={error || 'Astrologer not found'} onRetry={() => reload()} /></div>;

  const fav = isFav(a.id);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${a.name} on Astro Venus`, url });
      else { await navigator.clipboard.writeText(url); toast('Profile link copied'); }
    } catch { /* cancelled */ }
  };
  const submitReview = async () => {
    setReviewErr('');
    if (!rating) return setReviewErr('Please choose a star rating');
    if (comment.trim().length < 10) return setReviewErr('Please write at least 10 characters');
    setPosting(true);
    try {
      await api('/api/reviews', { method: 'POST', body: { astrologer_id: a.id, rating, comment } });
      toast('Thank you for your review');
      setRating(0); setComment('');
      reload(true);
    } catch (e: any) { setReviewErr(e.message); } finally { setPosting(false); }
  };

  const today = DAYS[new Date().getDay()];
  const modes = [
    { key: 'chat' as const, icon: MessageCircle, label: 'Chat', price: a.chat_price },
    { key: 'audio' as const, icon: Phone, label: 'Audio Call', price: a.call_price },
    { key: 'video' as const, icon: Video, label: 'Video Call', price: a.video_price },
  ];

  return (
    <div className="pb-28 lg:pb-0">
      <section className="relative bg-celestial overflow-hidden">
        <StarField count={30} seed={17} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10">
          <button onClick={() => nav(-1)} className="btn btn-ghost btn-sm mb-4 -ml-2"><ChevronLeft className="h-4 w-4" /> Back</button>
          <div className="card gold-border p-5 sm:p-8 grid md:grid-cols-[auto_1fr] gap-6 md:gap-8">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative mx-auto md:mx-0">
              <div className={`rounded-[2rem] p-[3px] ${a.is_online ? 'bg-gold-grad' : 'bg-line'}`}>
                <img src={a.photo} alt={a.name} className="h-44 w-44 sm:h-56 sm:w-56 rounded-[1.85rem] object-cover" />
              </div>
              <StatusPill online={a.is_online} className="absolute -bottom-3 left-1/2 -translate-x-1/2 shadow-soft !px-3 !py-1 ring-2 ring-pearl" />
            </motion.div>
            <div className="min-w-0 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {a.verified && <span className="chip chip-gold"><Verified className="h-3.5 w-3.5" /> Verified</span>}
                {a.featured && <span className="chip chip-rose"><Sparkles className="h-3 w-3" /> Featured</span>}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl text-plum mt-3">{a.name}</h1>
              <p className="text-muted mt-1">{a.title}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 mt-4 text-sm">
                <span className="flex items-center gap-1.5"><Stars value={a.rating} /> <b>{Number(a.rating).toFixed(1)}</b> <span className="text-muted">({a.reviews_count} reviews)</span></span>
                <span className="flex items-center gap-1.5 text-ink/80"><Briefcase className="h-4 w-4 text-gold" />{a.experience} yrs</span>
                <span className="flex items-center gap-1.5 text-ink/80"><MessageCircle className="h-4 w-4 text-gold" />{Number(a.orders_count).toLocaleString('en-IN')} consults</span>
                <span className="flex items-center gap-1.5 text-ink/80"><Users className="h-4 w-4 text-gold" />{a.followers} followers</span>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-4">{(a.expertise || []).map((e: string) => <span key={e} className="chip chip-gold">{e}</span>)}</div>
              <p className="text-sm text-ink/70 mt-3 flex items-center justify-center md:justify-start gap-1.5"><Languages className="h-4 w-4 text-gold" />{(a.languages || []).join(' · ')}</p>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
                {modes.map((m) => (
                  <button key={m.key} onClick={() => start(a, m.key)} className="rounded-2xl border border-line bg-pearl hover:border-rose hover:shadow-rose transition p-3 sm:p-4 text-center group">
                    <m.icon className="h-5 w-5 mx-auto text-rose-deep group-hover:scale-110 transition" />
                    <p className="text-xs text-muted mt-1.5">{m.label}</p>
                    <p className="font-semibold text-plum">{inr(m.price)}<span className="text-xs font-normal text-muted">/min</span></p>
                  </button>
                ))}
              </div>
              <div className="hidden lg:flex flex-wrap gap-2 mt-5">
                <button onClick={() => start(a, 'chat')} className="btn btn-rose"><MessageCircle className="h-4 w-4" /> Chat</button>
                <button onClick={() => start(a, 'audio')} className="btn btn-plum"><Phone className="h-4 w-4" /> Audio</button>
                <button onClick={() => start(a, 'video')} className="btn btn-plum"><Video className="h-4 w-4" /> Video</button>
                <Link to={`/book/${a.slug}`} className="btn btn-gold"><CalendarDays className="h-4 w-4" /> Book session</Link>
                <button onClick={() => toggle(a.id, a.name)} className={`btn ${fav ? 'btn-outline !text-rose-deep !border-rose' : 'btn-outline'}`}><Heart className={`h-4 w-4 ${fav ? 'fill-rose text-rose' : ''}`} />{fav ? 'Following' : 'Follow'}</button>
                <button onClick={share} className="btn btn-ghost" aria-label="Share"><Share2 className="h-4 w-4" /></button>
              </div>
              <div className="flex lg:hidden justify-center gap-2 mt-4">
                <button onClick={() => toggle(a.id, a.name)} className="btn btn-outline btn-sm"><Heart className={`h-4 w-4 ${fav ? 'fill-rose text-rose' : ''}`} />{fav ? 'Following' : 'Follow'}</button>
                <button onClick={share} className="btn btn-outline btn-sm"><Share2 className="h-4 w-4" /> Share</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[1fr_340px] gap-8">
        <div className="min-w-0">
          <Tabs value={tab} onChange={setTab} tabs={[{ key: 'about', label: 'About' }, { key: 'reviews', label: 'Reviews', count: a.reviews.length }, { key: 'services', label: 'Services' }, { key: 'videos', label: 'Videos', count: (a.videos || []).length }, { key: 'availability', label: 'Availability' }]} />
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            {tab === 'about' && (
              <div className="card p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-semibold text-plum">About {a.name.split(' ')[0]}</h2>
                <p className="mt-4 text-ink/80 leading-relaxed whitespace-pre-line">{a.bio}</p>
                <div className="grid sm:grid-cols-2 gap-3 mt-6">
                  {[
                    { i: GraduationCap, l: 'Education', v: a.education || '—' },
                    { i: MapPin, l: 'Based in', v: a.city || '—' },
                    { i: Briefcase, l: 'Experience', v: `${a.experience} years` },
                    { i: ShieldCheck, l: 'Verification', v: a.verified ? 'KYC verified' : 'Pending' },
                  ].map((x) => (
                    <div key={x.l} className="flex items-center gap-3 rounded-2xl bg-cream/60 p-4"><x.i className="h-5 w-5 text-gold shrink-0" /><div><p className="text-[11px] uppercase tracking-wider text-muted">{x.l}</p><p className="text-sm font-medium">{x.v}</p></div></div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'reviews' && (
              <div className="space-y-5">
                <div className="card p-6 grid sm:grid-cols-[180px_1fr] gap-6 items-center">
                  <div className="text-center"><p className="font-display text-5xl text-plum">{Number(a.rating).toFixed(1)}</p><Stars value={a.rating} size={16} className="mt-1" /><p className="text-xs text-muted mt-1">{a.reviews_count} reviews</p></div>
                  <div className="space-y-1.5">{breakdown.map((b) => (
                    <div key={b.s} className="flex items-center gap-3 text-sm"><span className="w-6">{b.s}★</span><div className="flex-1 h-2 rounded-full bg-cream overflow-hidden"><div className="h-full bg-gold-grad rounded-full" style={{ width: `${b.pct}%` }} /></div><span className="w-8 text-right text-muted">{b.n}</span></div>
                  ))}</div>
                </div>
                {user && role === 'customer' && (
                  <div className="card p-6">
                    <h3 className="font-serif text-xl font-semibold text-plum">Share your experience</h3>
                    <div className="flex gap-1 mt-3">{[1, 2, 3, 4, 5].map((s) => <button key={s} onClick={() => setRating(s)} aria-label={`${s} stars`}><Star className={`h-7 w-7 transition ${s <= rating ? 'fill-gold text-gold' : 'text-gold-light'}`} /></button>)}</div>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="How did the consultation help you?" className="input mt-3" />
                    {reviewErr && <p className="text-xs text-danger mt-1">{reviewErr}</p>}
                    <button onClick={submitReview} disabled={posting} className="btn btn-rose btn-sm mt-3">{posting ? 'Posting…' : 'Post review'}</button>
                  </div>
                )}
                {a.reviews.length === 0 ? <div className="card"><EmptyState icon={Star} title="No reviews yet" text="Be the first to share your experience." /></div> : a.reviews.map((r: any) => (
                  <div key={r.id} className="card p-5">
                    <div className="flex items-center gap-3"><Avatar name={r.user_name} size={40} /><div className="flex-1"><p className="font-medium">{r.user_name}</p><div className="flex items-center gap-2"><Stars value={r.rating} size={12} /><span className="text-xs text-muted">{timeAgo(r.created_at)}</span></div></div></div>
                    {r.comment && <p className="mt-3 text-ink/80 leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            {tab === 'services' && (
              <div className="grid sm:grid-cols-2 gap-4">
                {(services.data || []).filter((s) => (a.expertise || []).some((e: string) => e === s.category) || s.category === 'Vedic Astrology').concat((services.data || []).filter((s) => !(a.expertise || []).includes(s.category) && s.category !== 'Vedic Astrology').slice(0, 2)).map((s) => {
                  const I = SERVICE_ICONS[s.icon] || Sparkles;
                  return (
                    <div key={s.id} className="card p-5 flex flex-col">
                      <div className="flex items-center gap-3"><span className="h-11 w-11 rounded-2xl bg-gold-grad flex items-center justify-center"><I className="h-5 w-5 text-plum-deep" /></span><h3 className="font-serif text-xl font-semibold text-plum">{s.name}</h3></div>
                      <p className="text-sm text-muted mt-3 flex-1">{s.description}</p>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                        <div className="text-sm"><p className="text-muted text-xs">30-min session from</p><p className="font-semibold text-rose-deep">{inr(a.chat_price * 30)}</p></div>
                        <Link to={`/book/${a.slug}?service=${s.id}`} className="btn btn-rose btn-sm">Book</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'videos' && ((a.videos || []).length === 0 ? <div className="card"><EmptyState icon={Play} title="No videos yet" text={`${a.name.split(' ')[0]} hasn’t shared any videos.`} /></div> : (
              <div className="grid sm:grid-cols-2 gap-4">
                {(a.videos || []).map((v: any, i: number) => (
                  <div key={i} className="card overflow-hidden">
                    <video src={v.url} poster={v.poster || a.photo} controls preload="none" className="w-full aspect-video object-cover bg-plum-deep" />
                    <div className="p-4"><p className="font-medium">{v.title}</p><p className="text-xs text-muted mt-0.5">{v.duration}</p></div>
                  </div>
                ))}
              </div>
            ))}

            {tab === 'availability' && (
              <div className="card p-6">
                <h3 className="font-serif text-xl font-semibold text-plum mb-4">Weekly schedule</h3>
                <div className="divide-y divide-line">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => {
                    const av = a.availability?.[d];
                    return (
                      <div key={d} className={`flex items-center justify-between py-3 ${d === today ? 'text-rose-deep font-medium' : ''}`}>
                        <span>{DAY_LABEL[d]} {d === today && <span className="chip chip-rose ml-2 !text-[10px]">Today</span>}</span>
                        <span className="text-sm">{av?.on ? `${label12(av.start)} – ${label12(av.end)}` : <span className="text-muted">Unavailable</span>}</span>
                      </div>
                    );
                  })}
                </div>
                <Link to={`/book/${a.slug}`} className="btn btn-gold w-full mt-5"><CalendarDays className="h-4 w-4" /> Pick a time slot</Link>
              </div>
            )}
          </motion.div>
        </div>

        <aside className="space-y-5">
          <div className="card gold-border p-6 lg:sticky lg:top-24">
            <p className="text-[11px] uppercase tracking-[0.25em] text-gold-deep">Consultation</p>
            <h3 className="font-serif text-2xl font-semibold text-plum mt-1">{a.is_online ? 'Available now' : 'Schedule a session'}</h3>
            <p className="text-sm text-muted mt-1 flex items-center gap-1.5"><Clock className="h-4 w-4 text-gold" />{a.availability?.[today]?.on ? `Today ${label12(a.availability[today].start)} – ${label12(a.availability[today].end)}` : 'Not scheduled today'}</p>
            <div className="mt-5 space-y-2">
              {modes.map((m) => (
                <button key={m.key} onClick={() => start(a, m.key)} className="w-full flex items-center justify-between rounded-2xl border border-line px-4 py-3 hover:bg-blush/40 hover:border-rose transition">
                  <span className="flex items-center gap-2.5 text-sm"><m.icon className="h-4 w-4 text-rose-deep" />{m.label}</span><span className="font-semibold text-plum">{inr(m.price)}/min</span>
                </button>
              ))}
            </div>
            <Link to={`/book/${a.slug}`} className="btn btn-gold w-full mt-4"><CalendarDays className="h-4 w-4" /> Book a session</Link>
          </div>
          <div className="card p-5">
            <h4 className="font-display text-xs tracking-[0.2em] text-plum mb-3">SIMILAR EXPERTS</h4>
            <div className="space-y-3">
              {(similar.data || []).filter((s) => s.id !== a.id).slice(0, 4).map((s) => (
                <Link key={s.id} to={`/astrologer/${s.slug}`} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-cream">
                  <img src={s.photo} className="h-11 w-11 rounded-xl object-cover" alt="" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate flex items-center gap-1">{s.name}{s.verified && <Verified className="h-3.5 w-3.5" />}</p><p className="text-xs text-muted">★ {Number(s.rating).toFixed(1)} · {inr(s.chat_price)}/min</p></div>
                  <span className={`h-2 w-2 rounded-full ${s.is_online ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky mobile CTA */}
      <div className="lg:hidden fixed bottom-[62px] inset-x-0 z-40 px-3 pb-2">
        <div className="card gold-border p-2 flex gap-2 shadow-lux">
          <button onClick={() => start(a, 'chat')} className="btn btn-rose flex-1 !px-2"><MessageCircle className="h-4 w-4" /> Chat</button>
          <button onClick={() => start(a, 'audio')} className="btn btn-plum !px-3" aria-label="Audio call"><Phone className="h-4 w-4" /></button>
          <button onClick={() => start(a, 'video')} className="btn btn-plum !px-3" aria-label="Video call"><Video className="h-4 w-4" /></button>
          <Link to={`/book/${a.slug}`} className="btn btn-gold flex-1 !px-2"><CalendarDays className="h-4 w-4" /> Book</Link>
        </div>
      </div>
    </div>
  );
}
