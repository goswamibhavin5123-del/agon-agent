import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Orbit, Save, Trash2, User, Calendar, Clock, MapPin, Sparkles, MessageCircle, Download, RotateCcw } from 'lucide-react';
import { computeKundli, CITIES } from '../lib/kundli';
import { api, useApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import KundliChart from '../components/KundliChart';
import { Field, Tabs, EmptyState } from '../components/ui';
import { StarField, ZodiacWheel } from '../components/Celestial';
import { fmtDate } from '../lib/format';

const fmtDeg = (d: number) => `${Math.floor(d)}° ${String(Math.floor((d % 1) * 60)).padStart(2, '0')}′`;

export default function Kundli({ embedded = false }: { embedded?: boolean }) {
  const { user, profile, role } = useAuth();
  const canSave = !!user && role === 'customer';
  const { toast } = useToast();
  const saved = useApi<any[]>(canSave ? '/api/me?section=kundli' : null, [user?.id, role]);
  const [form, setForm] = useState({ name: profile?.full_name || '', gender: 'female', dob: profile?.dob || '', tob: profile?.tob || '', city: CITIES[0].name, lat: CITIES[0].lat, lon: CITIES[0].lon, tz: CITIES[0].tz });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [input, setInput] = useState<any>(null);
  const [tab, setTab] = useState('chart');
  const [saving, setSaving] = useState(false);
  const chart = useMemo(() => (input ? computeKundli(input) : null), [input]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const chooseCity = (name: string) => {
    const c = CITIES.find((x) => x.name === name);
    if (c) setForm((f) => ({ ...f, city: c.name, lat: c.lat, lon: c.lon, tz: c.tz }));
    else set('city', name);
  };
  const generate = (e?: React.FormEvent) => {
    e?.preventDefault();
    const er: Record<string, string> = {};
    if (!form.name.trim()) er.name = 'Please enter a name';
    if (!form.dob) er.dob = 'Date of birth is required';
    else if (new Date(form.dob) > new Date()) er.dob = 'Date cannot be in the future';
    if (!form.tob) er.tob = 'Birth time is required';
    if (Math.abs(Number(form.lat)) > 90) er.lat = 'Latitude must be between -90 and 90';
    if (Math.abs(Number(form.lon)) > 180) er.lon = 'Longitude must be between -180 and 180';
    setErrors(er);
    if (Object.keys(er).length) return;
    setInput({ name: form.name, dob: form.dob, tob: form.tob, lat: Number(form.lat), lon: Number(form.lon), tz: Number(form.tz) });
    setTab('chart');
    setTimeout(() => document.getElementById('kundli-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const save = async () => {
    if (!user) { toast('Sign in to save your Kundli', 'info'); return; }
    if (!canSave) { toast('Saving charts is available to customer accounts', 'info'); return; }
    if (!chart) return;
    setSaving(true);
    try {
      await api('/api/me', { method: 'POST', body: { action: 'kundli_save', name: form.name, gender: form.gender, dob: form.dob, tob: form.tob, place: form.city, lat: form.lat, lon: form.lon, tz: form.tz, chart: { ascendant: chart.ascendant.signName, moon: chart.moonSign, sun: chart.sunSign, nakshatra: chart.nakshatra.name } } });
      toast('Kundli saved to your account');
      saved.reload(true);
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  const remove = async (id: number) => {
    try { await api('/api/me', { method: 'POST', body: { action: 'kundli_delete', id } }); saved.reload(true); toast('Kundli removed', 'info'); } catch (e: any) { toast(e.message, 'error'); }
  };
  const load = (k: any) => {
    setForm({ name: k.name, gender: k.gender || 'female', dob: k.dob, tob: k.tob, city: k.place, lat: Number(k.lat), lon: Number(k.lon), tz: Number(k.tz) });
    setInput({ name: k.name, dob: k.dob, tob: k.tob, lat: Number(k.lat), lon: Number(k.lon), tz: Number(k.tz) });
    setTimeout(() => document.getElementById('kundli-result')?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  return (
    <div>
      {!embedded && (
        <section className="relative bg-celestial overflow-hidden">
          <StarField count={35} seed={41} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
            <p className="text-[11px] tracking-[0.35em] uppercase text-gold-deep font-medium">Free Janam Kundli</p>
            <h1 className="font-display text-4xl sm:text-5xl text-plum mt-3">Your <span className="font-serif italic font-medium text-rose-grad">cosmic</span> blueprint</h1>
            <p className="text-muted mt-3 max-w-xl mx-auto">Generate your Vedic birth chart with planetary positions, houses, Nakshatra and Vimshottari Dasha — calculated with the sidereal (Lahiri) zodiac.</p>
          </div>
        </section>
      )}
      <div className={embedded ? 'space-y-6' : 'max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8'}>
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <form onSubmit={generate} className="card gold-border p-6 sm:p-8">
            <h2 className="font-serif text-2xl font-semibold text-plum flex items-center gap-2"><Orbit className="h-6 w-6 text-gold" /> Birth details</h2>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <Field label="Full name" error={errors.name}><div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" /><input className={`input !pl-10 ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ananya Sharma" /></div></Field>
              <Field label="Gender"><div className="grid grid-cols-3 gap-1.5">{['female', 'male', 'other'].map((gd) => <button type="button" key={gd} onClick={() => set('gender', gd)} className={`chip justify-center !py-2.5 capitalize ${form.gender === gd ? 'chip-active' : ''}`}>{gd}</button>)}</div></Field>
              <Field label="Date of birth" error={errors.dob}><div className="relative"><Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" /><input type="date" className={`input !pl-10 ${errors.dob ? 'input-error' : ''}`} value={form.dob} onChange={(e) => set('dob', e.target.value)} max={new Date().toISOString().slice(0, 10)} /></div></Field>
              <Field label="Time of birth" error={errors.tob}><div className="relative"><Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" /><input type="time" className={`input !pl-10 ${errors.tob ? 'input-error' : ''}`} value={form.tob} onChange={(e) => set('tob', e.target.value)} /></div></Field>
              <Field label="Birth place" hint="Choose a city or enter custom coordinates"><div className="relative"><MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" /><select className="input !pl-10" value={CITIES.some((c) => c.name === form.city) ? form.city : 'custom'} onChange={(e) => (e.target.value === 'custom' ? set('city', 'Custom location') : chooseCity(e.target.value))}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}<option value="custom">Custom location…</option></select></div></Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Lat" error={errors.lat}><input type="number" step="0.0001" className="input !px-2.5" value={form.lat} onChange={(e) => set('lat', e.target.value)} /></Field>
                <Field label="Lon" error={errors.lon}><input type="number" step="0.0001" className="input !px-2.5" value={form.lon} onChange={(e) => set('lon', e.target.value)} /></Field>
                <Field label="UTC ±"><input type="number" step="0.5" className="input !px-2.5" value={form.tz} onChange={(e) => set('tz', e.target.value)} /></Field>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-7">
              <button type="submit" className="btn btn-rose btn-lg"><Sparkles className="h-5 w-5" /> Generate Kundli</button>
              {chart && <button type="button" onClick={save} disabled={saving} className="btn btn-outline btn-lg"><Save className="h-5 w-5" /> {saving ? 'Saving…' : 'Save'}</button>}
            </div>
          </form>
          <aside className="card p-6">
            <h3 className="font-display text-xs tracking-[0.2em] text-plum">SAVED KUNDLIS</h3>
            {!user ? <p className="text-sm text-muted mt-3"><Link to="/login" className="text-rose-deep font-medium">Sign in</Link> to save charts for yourself and loved ones.</p> : !canSave ? <p className="text-sm text-muted mt-3">Saving charts is available to customer accounts.</p> :
              saved.loading ? <div className="space-y-2 mt-3"><div className="skeleton h-14" /><div className="skeleton h-14" /></div> :
              (saved.data || []).length === 0 ? <p className="text-sm text-muted mt-3">No saved charts yet. Generate one and tap Save.</p> : (
                <div className="space-y-2 mt-3 max-h-80 overflow-y-auto">
                  {(saved.data || []).map((k) => (
                    <div key={k.id} className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:border-gold-light">
                      <button onClick={() => load(k)} className="flex-1 text-left min-w-0"><p className="text-sm font-medium truncate">{k.name}</p><p className="text-xs text-muted">{fmtDate(k.dob)} · {k.chart?.ascendant} Lagna</p></button>
                      <button onClick={() => remove(k.id)} className="h-8 w-8 rounded-full hover:bg-rose-50 text-muted hover:text-danger flex items-center justify-center" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
          </aside>
        </div>

        <div id="kundli-result" className="scroll-mt-24">
          {!chart ? (
            <div className="card relative overflow-hidden"><ZodiacWheel className="absolute -right-20 -top-20 w-72 opacity-20" /><EmptyState icon={Orbit} title="Your chart will appear here" text="Enter accurate birth details — even a few minutes can change the ascendant." /></div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[{ l: 'Lagna (Ascendant)', v: chart.ascendant.signName, s: fmtDeg(chart.ascendant.degree) }, { l: 'Moon sign (Rashi)', v: chart.moonSign, s: `Lord ${['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'][chart.planets[1].sign]}` }, { l: 'Sun sign', v: chart.sunSign, s: 'Sidereal' }, { l: 'Nakshatra', v: chart.nakshatra.name, s: `Pada ${chart.nakshatra.pada}` }].map((x) => (
                  <div key={x.l} className="card p-4"><p className="text-[10px] uppercase tracking-wider text-muted">{x.l}</p><p className="font-serif text-2xl font-semibold text-plum mt-1">{x.v}</p><p className="text-xs text-gold-deep">{x.s}</p></div>
                ))}
              </div>
              <Tabs value={tab} onChange={setTab} tabs={[{ key: 'chart', label: 'Chart' }, { key: 'planets', label: 'Planets' }, { key: 'houses', label: 'Houses' }, { key: 'nakshatra', label: 'Nakshatra' }, { key: 'dasha', label: 'Dasha' }]} className="w-fit max-w-full" />
              {tab === 'chart' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="card p-6"><h3 className="font-serif text-xl font-semibold text-plum text-center mb-4">Lagna Chart (D1) · North Indian</h3><KundliChart houses={chart.houses} ascDegree={chart.ascendant.degree} /><p className="text-xs text-muted text-center mt-3">Numbers mark zodiac signs (1 = Aries). House 1 is the top centre diamond.</p></div>
                  <div className="card p-6">
                    <h3 className="font-serif text-xl font-semibold text-plum mb-4">Chart summary for {input.name}</h3>
                    <ul className="space-y-3 text-sm text-ink/80 leading-relaxed">
                      <li><b className="text-plum">{chart.ascendant.signName} ascendant</b> ruled by {chart.ascendant.lord} shapes your outward personality and life approach.</li>
                      <li>Your <b className="text-plum">Moon in {chart.moonSign}</b> ({chart.nakshatra.name} Nakshatra) reveals your emotional nature — {chart.nakshatra.gana} gana, presided over by {chart.nakshatra.deity}.</li>
                      {chart.current && <li>You are running <b className="text-plum">{chart.current.planet} Mahadasha</b> until {fmtDate(chart.current.end)}, colouring this chapter of life with {chart.current.planet}’s themes.</li>}
                      <li>Retrograde planets: {chart.planets.filter((p) => p.retro && p.name !== 'Rahu' && p.name !== 'Ketu').map((p) => p.name).join(', ') || 'none'}.</li>
                    </ul>
                    <div className="mt-6 rounded-2xl bg-blush/50 p-5">
                      <p className="font-serif text-lg text-plum font-semibold">Interpret your chart with an expert</p>
                      <p className="text-sm text-muted mt-1">Share this Kundli in your consultation for precise predictions and remedies.</p>
                      <div className="flex flex-wrap gap-2 mt-4"><Link to="/astrologers?expertise=Vedic%20Astrology" className="btn btn-rose btn-sm"><MessageCircle className="h-4 w-4" /> Consult now</Link><button onClick={() => window.print()} className="btn btn-outline btn-sm"><Download className="h-4 w-4" /> Print / PDF</button></div>
                    </div>
                  </div>
                </div>
              )}
              {tab === 'planets' && (
                <div className="card overflow-x-auto">
                  <table className="table-lux min-w-[640px]">
                    <thead><tr><th>Planet</th><th>Sign</th><th>Degree</th><th>House</th><th>Nakshatra</th><th>Pada</th><th>Motion</th></tr></thead>
                    <tbody>
                      <tr><td className="font-medium text-plum">Ascendant</td><td>{chart.ascendant.signName}</td><td>{fmtDeg(chart.ascendant.degree)}</td><td>1</td><td>{chart.ascendant.nakshatra}</td><td>—</td><td>—</td></tr>
                      {chart.planets.map((p) => <tr key={p.name}><td className="font-medium text-plum">{p.name}</td><td>{p.signName}</td><td>{fmtDeg(p.degree)}</td><td>{p.house}</td><td>{p.nakshatra}</td><td>{p.pada}</td><td>{p.retro ? <span className="chip chip-rose !text-[10px]">Retrograde</span> : <span className="text-muted text-xs">Direct</span>}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}
              {tab === 'houses' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {chart.houses.map((h) => (
                    <div key={h.house} className="card p-5">
                      <div className="flex items-center justify-between"><span className="font-display text-lg text-gold-grad">House {h.house}</span><span className="chip chip-gold">{h.signName}</span></div>
                      <p className="text-sm text-muted mt-2">{h.meaning}</p>
                      <div className="flex items-center justify-between mt-3 text-xs"><span>Lord: <b>{h.lord}</b></span><span>{h.planets.length ? h.planets.join(' · ') : <span className="text-muted">Empty</span>}</span></div>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'nakshatra' && (
                <div className="card gold-border p-6 sm:p-8 grid md:grid-cols-[200px_1fr] gap-8 items-center">
                  <div className="text-center"><div className="mx-auto h-40 w-40 rounded-full bg-plum-grad flex flex-col items-center justify-center text-white shadow-lux"><span className="text-[10px] tracking-[0.3em] text-gold-light">NAKSHATRA</span><span className="font-display text-5xl text-gold-grad">{chart.nakshatra.index}</span><span className="text-xs text-white/60">of 27</span></div></div>
                  <div>
                    <h3 className="font-display text-3xl text-plum">{chart.nakshatra.name}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                      {[['Pada', chart.nakshatra.pada], ['Lord', chart.nakshatra.lord], ['Deity', chart.nakshatra.deity], ['Gana', chart.nakshatra.gana]].map(([l, v]) => <div key={l as string} className="rounded-2xl bg-cream/60 p-3"><p className="text-[10px] uppercase tracking-wider text-muted">{l}</p><p className="font-medium text-sm">{v}</p></div>)}
                    </div>
                    <p className="text-sm text-ink/75 mt-5 leading-relaxed">Your birth star is determined by the Moon’s position ({fmtDeg(chart.planets[1].degree)} {chart.moonSign}). It governs your Dasha sequence, beginning with {chart.nakshatra.lord}, and is central to Kundli matching.</p>
                  </div>
                </div>
              )}
              {tab === 'dasha' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <h3 className="font-serif text-xl font-semibold text-plum mb-4">Vimshottari Mahadasha</h3>
                    <div className="relative pl-6 space-y-3">
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-gold via-rose to-plum" />
                      {chart.dashas.map((d) => {
                        const cur = chart.current?.planet === d.planet && chart.current?.start === d.start;
                        return (
                          <div key={d.start} className={`relative rounded-2xl p-3 ${cur ? 'bg-blush border border-rose/30' : ''}`}>
                            <span className={`absolute -left-[22px] top-4 h-3 w-3 rounded-full ring-4 ring-pearl ${cur ? 'bg-rose' : 'bg-gold-light'}`} />
                            <div className="flex justify-between"><p className="font-medium">{d.planet} {cur && <span className="chip chip-rose !text-[10px] ml-1">Current</span>}</p><span className="text-xs text-muted">{d.years} yrs</span></div>
                            <p className="text-xs text-muted">{fmtDate(d.start)} → {fmtDate(d.end)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="card p-6">
                    <h3 className="font-serif text-xl font-semibold text-plum mb-4">Antardasha in {chart.current?.planet || '—'}</h3>
                    {chart.antardashas.length ? <div className="space-y-2">{chart.antardashas.map((a) => {
                      const cur = new Date(a.start).getTime() <= Date.now() && new Date(a.end).getTime() > Date.now();
                      return <div key={a.start} className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${cur ? 'bg-plum text-white' : 'bg-cream/60'}`}><span>{chart.current?.planet} / {a.planet}</span><span className={cur ? 'text-gold-light' : 'text-muted'}>{fmtDate(a.end)}</span></div>;
                    })}</div> : <p className="text-sm text-muted">Dasha period outside the computed range.</p>}
                  </div>
                </div>
              )}
              <button onClick={() => { setInput(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn btn-ghost btn-sm"><RotateCcw className="h-4 w-4" /> New chart</button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
