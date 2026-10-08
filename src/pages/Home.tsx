import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, Video, Orbit, Sun, HeartHandshake, ShieldCheck, BadgeCheck, Lock, ArrowRight, Star, Quote, Sparkles, Wallet, Clock, Gem, Briefcase, Heart, Baby, Hand, Hash, Moon, Flower2, Home as HomeIcon, Users } from 'lucide-react';
import { useApi } from '../lib/api';
import { SectionHeading, Stars, Modal, Skeleton, ErrorState, Verified } from '../components/ui';
import AstrologerCard, { AstrologerCardSkeleton, MiniAstroCard } from '../components/AstrologerCard';
import { StarField, ZodiacWheel, Sparkle } from '../components/Celestial';
import { StoreBadges } from '../components/Footer';
import { LOGO } from '../components/Brand';
import { SIGNS, g } from '../lib/zodiac';
import { inr, fmtDate } from '../lib/format';
import { useConsult } from '../contexts/ConsultContext';

export const SERVICE_ICONS: Record<string, any> = { heart: Heart, briefcase: Briefcase, ring: HeartHandshake, gem: Gem, baby: Baby, hand: Hand, hash: Hash, moon: Moon, flower: Flower2, home: HomeIcon, orbit: Orbit, sun: Sun };

export default function Home() {
  const nav = useNavigate();
  const { start } = useConsult();
  const astros = useApi<any[]>('/api/astrologers?sort=recommended');
  const services = useApi<any[]>('/api/content?type=services');
  const testimonials = useApi<any[]>('/api/content?type=testimonials');
  const horos = useApi<any[]>('/api/content?type=horoscopes&period=daily');
  const blogs = useApi<any[]>('/api/content?type=blogs&limit=3');
  const [sign, setSign] = useState<string | null>(null);

  const list = astros.data || [];
  const online = list.filter((a) => a.is_online);
  const top = [...list].sort((a, b) => b.rating - a.rating || b.orders_count - a.orders_count).slice(0, 8);
  const totalConsults = list.reduce((s, a) => s + Number(a.orders_count || 0), 0);
  const avgRating = list.length ? (list.reduce((s, a) => s + Number(a.rating), 0) / list.length).toFixed(1) : '—';
  const firstOnline = online[0];
  const h = horos.data?.find((x) => x.sign === sign);
  const signInfo = SIGNS.find((s) => s.key === sign);

  const quick = [
    { icon: MessageCircle, label: 'Chat with Astrologer', sub: 'Instant replies', to: '/astrologers', tone: 'from-[#FBE3EA] to-[#F7C9D6]' },
    { icon: Phone, label: 'Talk to Astrologer', sub: 'Private voice call', to: '/astrologers?mode=audio', tone: 'from-[#FFF3D9] to-[#F3DCA6]' },
    { icon: Video, label: 'Video Consultation', sub: 'Face-to-face', to: '/astrologers?mode=video', tone: 'from-[#F1E8F6] to-[#DCC7EA]' },
    { icon: Orbit, label: 'Free Kundli', sub: 'Birth chart', to: '/kundli', tone: 'from-[#FDEFE7] to-[#F3D2C3]' },
    { icon: Sun, label: 'Daily Horoscope', sub: '12 zodiac signs', to: '/horoscope', tone: 'from-[#FFF7E8] to-[#F6E2B5]' },
    { icon: HeartHandshake, label: 'Love Match', sub: 'Compatibility', to: '/astrologers?expertise=Love%20%26%20Relationships', tone: 'from-[#FDE8EE] to-[#F4BFCF]' },
  ];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-celestial">
        <StarField count={45} seed={3} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16 lg:pt-16 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="inline-flex items-center gap-2 rounded-full gold-border px-4 py-1.5 text-[11px] tracking-[0.25em] uppercase text-gold-deep">
              <Sparkle className="h-3 w-3 text-gold" /> Guided by stars · Empowered by you
            </span>
            <h1 className="font-display text-[2.6rem] leading-[1.08] sm:text-6xl lg:text-[4.1rem] text-plum mt-6">
              Find <span className="font-serif italic font-medium text-rose-grad">Clarity</span><br className="hidden sm:block" /> With Expert <span className="text-gold-grad">Astrologers</span>
            </h1>
            <p className="mt-6 text-lg text-ink/70 max-w-xl leading-relaxed">Private chat, call and video consultations with KYC-verified Vedic astrologers, tarot readers and numerologists — available the moment you need guidance.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => (firstOnline ? start(firstOnline, 'chat') : nav('/astrologers'))} className="btn btn-rose btn-lg"><MessageCircle className="h-5 w-5" /> Chat with Astrologer</button>
              <Link to="/astrologers?mode=audio" className="btn btn-outline btn-lg"><Phone className="h-5 w-5" /> Talk on Call</Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg">
              {[
                { v: astros.loading ? '—' : `${list.length}+`, l: 'Verified experts' },
                { v: astros.loading ? '—' : `${(totalConsults / 1000).toFixed(1)}k+`, l: 'Consultations' },
                { v: astros.loading ? '—' : `${avgRating}★`, l: 'Average rating' },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-pearl/70 border border-line px-4 py-3 backdrop-blur">
                  <p className="font-serif text-2xl sm:text-3xl font-semibold text-plum">{s.v}</p>
                  <p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.15 }} className="relative mx-auto w-full max-w-[520px] aspect-square">
            <ZodiacWheel className="absolute inset-0 w-full h-full animate-spin-slow opacity-80" />
            <div className="absolute inset-[9%] rounded-full bg-gradient-to-br from-blush via-pearl to-[#FFF3D9] blur-2xl opacity-80" />
            <div className="absolute inset-[12%] rounded-full p-[3px] bg-gold-grad shadow-lux">
              <div className="h-full w-full rounded-full overflow-hidden bg-pearl">
                <img src={LOGO} alt="Astro Rahu — goddess Venus with lotus, sun and the Venus planet" className="h-full w-full object-cover" style={{ transform: 'scale(1.08)', transformOrigin: '50% 38%' }} />
              </div>
            </div>
            {firstOnline && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="absolute left-0 sm:-left-4 top-[14%] card gold-border px-3 py-2.5 flex items-center gap-3 animate-floaty shadow-lux">
                <img src={firstOnline.photo} className="h-10 w-10 rounded-full object-cover" alt="" />
                <div className="text-left"><p className="text-sm font-medium flex items-center gap-1">{firstOnline.name.split(' ')[0]} <Verified className="h-3.5 w-3.5" /></p><p className="text-[11px] text-emerald-600 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online now</p></div>
              </motion.div>
            )}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }} className="absolute right-0 sm:-right-2 bottom-[16%] card gold-border px-4 py-3 shadow-lux animate-floaty" style={{ animationDelay: '1.5s' }}>
              <Stars value={5} size={13} />
              <p className="text-xs text-muted mt-1"><b className="text-ink">{avgRating}</b> from {list.reduce((s, a) => s + Number(a.reviews_count || 0), 0).toLocaleString('en-IN')} reviews</p>
            </motion.div>
            <div className="absolute left-[8%] bottom-[6%] card px-3 py-2 flex items-center gap-2 text-xs shadow-soft"><ShieldCheck className="h-4 w-4 text-gold" /> 100% private</div>
          </motion.div>
        </div>
      </section>

      {/* QUICK SERVICES */}
      <section className="relative -mt-6 z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="card gold-border p-3 sm:p-4 grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {quick.map((q, i) => (
            <motion.div key={q.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Link to={q.to} className="group flex flex-col items-center text-center rounded-2xl p-3 sm:p-4 hover:bg-cream/70 transition">
                <span className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${q.tone} flex items-center justify-center shadow-sm group-hover:scale-105 transition`}><q.icon className="h-6 w-6 text-plum" /></span>
                <span className="mt-3 text-[13px] font-medium leading-tight text-ink">{q.label}</span>
                <span className="text-[11px] text-muted mt-0.5 hidden sm:block">{q.sub}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ONLINE ASTROLOGERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">
        <SectionHeading align="left" eyebrow="Live now" title="Online" accent="Astrologers" subtitle="Connect instantly with an expert who’s ready for you." action={<Link to="/astrologers?online=true" className="btn btn-outline btn-sm">View all online <ArrowRight className="h-4 w-4" /></Link>} />
        {astros.error ? <ErrorState message={astros.error} onRetry={() => astros.reload()} /> : (
          <div className="flex gap-4 overflow-x-auto scrollbar-none pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            {astros.loading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[250px] w-44 shrink-0 rounded-3xl" />) :
              online.length ? online.map((a) => <MiniAstroCard key={a.id} a={a} />) : <p className="text-muted py-10">All astrologers are in session right now. Please book a slot.</p>}
          </div>
        )}
      </section>

      {/* SERVICES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">
        <SectionHeading eyebrow="What we offer" title="Astrology" accent="Services" subtitle="Ancient wisdom, thoughtfully delivered. Choose the guidance that speaks to your moment." />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {services.loading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />) : (services.data || []).map((s, i) => {
            const I = SERVICE_ICONS[s.icon] || Sparkles;
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.06 }}>
                <Link to={`/astrologers?expertise=${encodeURIComponent(s.category)}`} className="card card-hover p-5 block h-full relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blush/70 group-hover:scale-125 transition duration-500" />
                  <span className="relative h-12 w-12 rounded-2xl bg-gold-grad flex items-center justify-center shadow-lux"><I className="h-5 w-5 text-plum-deep" /></span>
                  <h3 className="relative font-serif text-xl font-semibold text-plum mt-4">{s.name}</h3>
                  <p className="relative text-sm text-muted mt-1 line-clamp-2">{s.description}</p>
                  <p className="relative text-xs text-rose-deep font-medium mt-3">From {inr(s.starting_price)}/min →</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* TOP ASTROLOGERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">
        <SectionHeading align="left" eyebrow="Most loved" title="Top" accent="Astrologers" subtitle="Highest-rated experts, chosen by thousands of seekers." action={<Link to="/astrologers" className="btn btn-plum btn-sm">Explore marketplace <ArrowRight className="h-4 w-4" /></Link>} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {astros.loading ? Array.from({ length: 8 }).map((_, i) => <AstrologerCardSkeleton key={i} />) : top.map((a, i) => <AstrologerCard key={a.id} a={a} index={i} />)}
        </div>
      </section>

      {/* DAILY HOROSCOPE */}
      <section className="relative mt-24 py-20 bg-plum-grad overflow-hidden">
        <StarField count={60} seed={21} color="#E8CD8A" />
        <ZodiacWheel className="absolute -right-40 -top-40 w-[520px] h-[520px] opacity-20 animate-spin-rev" stroke="#E8CD8A" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-[11px] tracking-[0.35em] uppercase text-gold-light font-medium mb-3">{fmtDate(new Date())}</p>
            <h2 className="font-display text-3xl sm:text-4xl text-white">Daily <span className="font-serif italic font-medium text-gold-grad">Horoscope</span></h2>
            <p className="text-white/60 mt-3">Tap your sign to read today’s cosmic guidance.</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {SIGNS.map((s, i) => (
              <motion.button key={s.key} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} onClick={() => setSign(s.key)}
                className="group rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-gold-light/50 backdrop-blur p-4 sm:p-5 text-center transition">
                <span className="block text-4xl sm:text-5xl text-gold-grad font-serif group-hover:scale-110 transition">{g(s.glyph)}</span>
                <span className="block font-display text-sm text-white mt-2 tracking-wider">{s.name}</span>
                <span className="block text-[10px] text-white/50 mt-0.5">{s.dates}</span>
              </motion.button>
            ))}
          </div>
          <div className="text-center mt-10"><Link to="/horoscope" className="btn btn-gold">Weekly, monthly & yearly forecasts <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-24">
        <SectionHeading eyebrow="Simple & private" title="Your Path to" accent="Clarity" />
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Users, t: 'Choose your astrologer', d: 'Filter by expertise, language, rating and price to find your perfect guide.' },
            { icon: Wallet, t: 'Add to your wallet', d: 'Recharge securely and enjoy bonus credit. Pay only for the minutes you use.' },
            { icon: MessageCircle, t: 'Consult instantly', d: 'Chat, call or video — now or at a booked time. Every session is 100% confidential.' },
          ].map((s, i) => (
            <div key={s.t} className="card p-7 relative overflow-hidden">
              <span className="absolute right-5 top-3 font-display text-7xl text-gold-light/30">{i + 1}</span>
              <span className="h-12 w-12 rounded-2xl bg-rose-grad flex items-center justify-center shadow-rose"><s.icon className="h-5 w-5 text-white" /></span>
              <h3 className="font-serif text-2xl font-semibold text-plum mt-5">{s.t}</h3>
              <p className="text-muted text-sm mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{ i: BadgeCheck, t: 'KYC-verified experts' }, { i: Lock, t: 'Encrypted & private' }, { i: Clock, t: 'Available 24×7' }, { i: ShieldCheck, t: 'Refund protection' }].map((x) => (
            <div key={x.t} className="flex items-center gap-3 rounded-2xl border border-line bg-pearl/60 px-4 py-3 text-sm"><x.i className="h-5 w-5 text-gold shrink-0" />{x.t}</div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-24">
        <SectionHeading eyebrow="Kind words" title="Stories of" accent="Transformation" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-3xl" />) : (testimonials.data || []).slice(0, 6).map((t, i) => (
            <motion.figure key={t.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08 }} className="card p-7 relative">
              <Quote className="absolute right-6 top-6 h-10 w-10 text-blush" />
              <Stars value={t.rating} />
              <blockquote className="font-serif text-xl leading-snug text-ink mt-4">“{t.text}”</blockquote>
              <figcaption className="flex items-center gap-3 mt-6">
                <span className="h-11 w-11 rounded-full bg-rosegold-grad text-white flex items-center justify-center font-display">{t.name[0]}</span>
                <span><span className="block font-medium">{t.name}</span><span className="block text-xs text-muted">{t.city} · {t.service}</span></span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* JOURNAL */}
      {(blogs.data || []).length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-24">
          <SectionHeading align="left" eyebrow="Astro journal" title="Cosmic" accent="Reads" action={<Link to="/blog" className="btn btn-outline btn-sm">All articles <ArrowRight className="h-4 w-4" /></Link>} />
          <div className="grid md:grid-cols-3 gap-5">
            {(blogs.data || []).map((b) => (
              <Link key={b.id} to={`/blog/${b.slug}`} className="card card-hover overflow-hidden group">
                <div className="aspect-[16/10] overflow-hidden"><img src={b.cover} alt="" className="h-full w-full object-cover group-hover:scale-105 transition duration-700" loading="lazy" /></div>
                <div className="p-5"><span className="chip chip-rose">{b.category}</span><h3 className="font-serif text-xl font-semibold text-plum mt-3 leading-snug">{b.title}</h3><p className="text-sm text-muted mt-2 line-clamp-2">{b.excerpt}</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* APP */}
      <section id="app" className="max-w-7xl mx-auto px-4 sm:px-6 pt-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-rosegold-grad p-8 sm:p-12 lg:p-16 grid lg:grid-cols-2 gap-10 items-center">
          <StarField count={30} seed={5} color="#fff" />
          <div className="relative">
            <p className="text-[11px] tracking-[0.35em] uppercase text-white/80 font-medium">Astro Rahu app</p>
            <h2 className="font-display text-3xl sm:text-5xl text-white mt-3 leading-tight">The stars, <span className="font-serif italic font-medium">in your pocket</span></h2>
            <p className="text-white/85 mt-4 max-w-md">Daily horoscope alerts, instant consultations, wallet top-ups and your saved Kundlis — wherever you are.</p>
            <ul className="mt-6 space-y-2 text-white/90 text-sm">
              {['Get notified when your favourite astrologer comes online', 'Voice notes & HD video consultations', 'Exclusive app-only recharge bonuses'].map((x) => <li key={x} className="flex items-center gap-2"><Sparkle className="h-3 w-3 text-gold-light" />{x}</li>)}
            </ul>
            <div className="mt-8"><StoreBadges /></div>
          </div>
          <div className="relative flex justify-center">
            <div className="relative w-[250px] h-[500px] rounded-[2.6rem] bg-plum-deep p-3 shadow-2xl rotate-[-4deg]">
              <div className="h-full w-full rounded-[2rem] bg-ivory overflow-hidden flex flex-col">
                <div className="bg-plum-grad px-4 pt-6 pb-5 text-white">
                  <p className="text-[10px] tracking-[0.3em] text-gold-light">Astro Rahu</p>
                  <p className="font-serif text-xl mt-1">Good evening ✨</p>
                  <div className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs flex justify-between"><span>Wallet</span><b className="text-gold-light">₹1,250</b></div>
                </div>
                <div className="p-3 space-y-2">
                  {online.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-xl bg-white border border-line p-2">
                      <img src={a.photo} className="h-9 w-9 rounded-lg object-cover" alt="" />
                      <div className="flex-1 min-w-0"><p className="text-[11px] font-medium truncate">{a.name}</p><p className="text-[9px] text-muted">{inr(a.chat_price)}/min</p></div>
                      <span className="text-[9px] rounded-full bg-rose-grad text-white px-2 py-1">Chat</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute top-10 right-4 sm:right-16 card px-3 py-2 text-xs shadow-lux rotate-3"><Star className="inline h-3 w-3 fill-gold text-gold" /> 4.8 on stores</div>
          </div>
        </div>
      </section>

      <Modal open={!!sign} onClose={() => setSign(null)} title={signInfo ? `${signInfo.name} · Today` : ''}>
        {signInfo && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="h-16 w-16 rounded-2xl bg-plum-grad flex items-center justify-center text-4xl text-gold-light font-serif">{g(signInfo.glyph)}</span>
              <div><p className="text-sm text-muted">{signInfo.dates}</p><p className="text-sm">{signInfo.element} · Ruled by {signInfo.ruler}</p></div>
            </div>
            {horos.loading ? <Skeleton className="h-24" /> : h ? (
              <>
                <p className="font-serif text-lg leading-relaxed">{h.overview}</p>
                <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                  <div className="rounded-2xl bg-blush/60 p-3"><p className="text-[10px] uppercase tracking-wider text-muted">Lucky no.</p><p className="font-semibold">{h.lucky_number}</p></div>
                  <div className="rounded-2xl bg-cream p-3"><p className="text-[10px] uppercase tracking-wider text-muted">Colour</p><p className="font-semibold">{h.lucky_color}</p></div>
                  <div className="rounded-2xl bg-lilac p-3"><p className="text-[10px] uppercase tracking-wider text-muted">Mood</p><p className="font-semibold">{h.mood}</p></div>
                </div>
              </>
            ) : <p className="text-muted">Today’s reading is being prepared.</p>}
            <div className="flex gap-2 mt-6">
              <Link to={`/horoscope/${signInfo.key}`} className="btn btn-plum flex-1">Full reading</Link>
              <Link to="/astrologers" className="btn btn-rose flex-1">Ask an astrologer</Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
