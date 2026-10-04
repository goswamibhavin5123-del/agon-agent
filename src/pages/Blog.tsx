import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Newspaper } from 'lucide-react';
import { useApi } from '../lib/api';
import { PageLoader, ErrorState, EmptyState, Skeleton, Ornament } from '../components/ui';
import { StarField } from '../components/Celestial';
import { fmtDate } from '../lib/format';

export function BlogList() {
  const { data, loading, error, reload } = useApi<any[]>('/api/content?type=blogs');
  const [first, ...rest] = data || [];
  return (
    <div>
      <section className="relative bg-celestial overflow-hidden">
        <StarField count={30} seed={51} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
          <p className="text-[11px] tracking-[0.35em] uppercase text-gold-deep font-medium">Astro journal</p>
          <h1 className="font-display text-4xl sm:text-5xl text-plum mt-3">Wisdom from the <span className="font-serif italic font-medium text-rose-grad">cosmos</span></h1>
        </div>
      </section>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {error ? <ErrorState message={error} onRetry={() => reload()} /> : loading ? <div className="grid md:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-3xl" />)}</div> : !first ? <div className="card"><EmptyState icon={Newspaper} title="No articles yet" /></div> : (
          <>
            <Link to={`/blog/${first.slug}`} className="card card-hover overflow-hidden grid md:grid-cols-2 group">
              <div className="aspect-[16/10] md:aspect-auto overflow-hidden"><img src={first.cover} alt="" className="h-full w-full object-cover group-hover:scale-105 transition duration-700" /></div>
              <div className="p-7 sm:p-10 flex flex-col justify-center"><span className="chip chip-rose w-fit">{first.category}</span><h2 className="font-serif text-3xl sm:text-4xl font-semibold text-plum mt-4 leading-tight">{first.title}</h2><p className="text-muted mt-3">{first.excerpt}</p><p className="text-xs text-muted mt-5">{first.author} · {fmtDate(first.created_at)} · {first.read_time} min read</p></div>
            </Link>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {rest.map((b) => (
                <Link key={b.id} to={`/blog/${b.slug}`} className="card card-hover overflow-hidden group">
                  <div className="aspect-[16/10] overflow-hidden"><img src={b.cover} alt="" loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition duration-700" /></div>
                  <div className="p-5"><span className="chip chip-gold">{b.category}</span><h3 className="font-serif text-xl font-semibold text-plum mt-3 leading-snug">{b.title}</h3><p className="text-sm text-muted mt-2 line-clamp-2">{b.excerpt}</p><p className="text-xs text-muted mt-3 flex items-center gap-1"><Clock className="h-3 w-3" />{b.read_time} min read</p></div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const { data: b, loading, error, reload } = useApi<any>(`/api/content?type=blogs&slug=${slug}`, [slug]);
  if (loading) return <PageLoader />;
  if (error || !b) return <div className="max-w-3xl mx-auto px-4 py-16"><ErrorState message={error || 'Not found'} onRetry={() => reload()} /></div>;
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/blog" className="btn btn-ghost btn-sm -ml-2"><ArrowLeft className="h-4 w-4" /> Journal</Link>
      <div className="text-center mt-6">
        <span className="chip chip-rose">{b.category}</span>
        <h1 className="font-display text-3xl sm:text-5xl text-plum mt-4 leading-tight">{b.title}</h1>
        <p className="text-sm text-muted mt-4">{b.author} · {fmtDate(b.created_at)} · {b.read_time} min read</p>
        <Ornament className="mt-5" />
      </div>
      <img src={b.cover} alt="" className="w-full rounded-[1.75rem] mt-8 aspect-[16/9] object-cover shadow-lux" />
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink/85 font-serif">
        {String(b.content || '').split('\n').filter(Boolean).map((p: string, i: number) => <p key={i} className={i === 0 ? 'first-letter:font-display first-letter:text-6xl first-letter:float-left first-letter:mr-3 first-letter:text-gold-grad first-letter:leading-none' : ''}>{p}</p>)}
      </div>
      <div className="card gold-border p-6 mt-10 text-center"><p className="font-serif text-2xl text-plum">Have a question about your chart?</p><Link to="/astrologers" className="btn btn-rose mt-4">Talk to an astrologer</Link></div>
    </article>
  );
}
