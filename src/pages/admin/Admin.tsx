import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { LayoutDashboard, Users, Star, ShieldCheck, Sparkles, CalendarDays, MessageCircle, Phone, CreditCard, Wallet, Percent, Banknote, Ticket, MessageSquareQuote, Newspaper, Sun, Megaphone, FileBarChart, BarChart3, Plus, Pencil, Trash2, Eye, IndianRupee, Radio, TrendingUp, UserCheck, Check, X, Ban, RotateCcw, LifeBuoy } from 'lucide-react';
import PanelShell from '../../components/PanelShell';
import DataTable, { toCSV } from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import { useApi, api, fileToBase64 } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { StatCard, Badge, Modal, Field, Stars, Avatar, Verified, Skeleton, ErrorState, Tabs } from '../../components/ui';
import { AreaChart, BarList, Donut } from '../../components/Charts';
import { inr, fmtDateTime, fmtDate, fmtDuration, fmtTime } from '../../lib/format';
import { EXPERTISE, LANGUAGES } from '../Astrologers';
import { SIGNS } from '../../lib/zodiac';

export default function Admin() {
  const stats = useApi<any>('/api/admin?section=stats');
  const s = stats.data;
  const items = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/astrologers', label: 'Astrologers', icon: Star },
    { to: '/admin/kyc', label: 'KYC', icon: ShieldCheck, badge: s?.kyc_pending || undefined },
    { to: '/admin/services', label: 'Services', icon: Sparkles },
    { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
    { to: '/admin/chats', label: 'Chats', icon: MessageCircle },
    { to: '/admin/calls', label: 'Calls', icon: Phone },
    { to: '/admin/payments', label: 'Payments', icon: CreditCard },
    { to: '/admin/wallet', label: 'Wallet', icon: Wallet },
    { to: '/admin/commission', label: 'Commission', icon: Percent },
    { to: '/admin/withdrawals', label: 'Withdrawals', icon: Banknote, badge: s?.withdrawals_pending || undefined },
    { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
    { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote },
    { to: '/admin/blogs', label: 'Blogs', icon: Newspaper },
    { to: '/admin/horoscope', label: 'Horoscope', icon: Sun },
    { to: '/admin/notifications', label: 'Notifications', icon: Megaphone },
    { to: '/admin/support', label: 'Support', icon: LifeBuoy },
    { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ];
  return (
    <PanelShell items={items} title="Admin Console" subtitle="Astro Rahu · Control center" dark
      topRight={<Link to="/launch-checklist" className="btn btn-gold btn-sm"><FileBarChart className="h-4 w-4" /><span className="hidden sm:inline">Launch checklist</span></Link>}>
      <Routes>
        <Route index element={<Dashboard stats={stats} />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="astrologers" element={<AstrologersPage />} />
        <Route path="kyc" element={<KycPage onChange={() => stats.reload(true)} />} />
        <Route path="services" element={<Crud type="services" title="service" columns={[{ key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> }, { key: 'category', label: 'Category' }, { key: 'starting_price', label: 'From', render: (r) => `${inr(r.starting_price)}/min` }, { key: 'sort_order', label: 'Order' }, { key: 'active', label: 'Status', render: (r) => <Badge status={r.active ? 'approved' : 'hidden'}>{r.active ? 'Active' : 'Hidden'}</Badge> }]}
          fields={[{ key: 'name', label: 'Name' }, { key: 'slug', label: 'Slug' }, { key: 'category', label: 'Category (matches expertise)', type: 'select', options: EXPERTISE }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'icon', label: 'Icon', type: 'select', options: ['heart', 'briefcase', 'ring', 'gem', 'baby', 'hand', 'hash', 'moon', 'flower', 'home', 'orbit', 'sun'] }, { key: 'starting_price', label: 'Starting price / min', type: 'number' }, { key: 'sort_order', label: 'Sort order', type: 'number' }, { key: 'active', label: 'Active', type: 'boolean' }]}
          defaults={{ active: true, sort_order: 99, icon: 'sun', starting_price: 20, category: 'Vedic Astrology' }} search={['name', 'category']} />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="chats" element={<ConsultPage modes="chat" />} />
        <Route path="calls" element={<ConsultPage modes="audio,video" />} />
        <Route path="payments" element={<><GatewayPayments /><div className="mt-8"><h2 className="font-serif text-xl font-semibold text-plum mb-3">Wallet spend (ledger)</h2><TxPage types="debit" title="wallet spend" /></div></>} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="commission" element={<CommissionPage />} />
        <Route path="withdrawals" element={<WithdrawalsPage onChange={() => stats.reload(true)} />} />
        <Route path="coupons" element={<Crud type="coupons" title="coupon" columns={[{ key: 'code', label: 'Code', render: (r) => <span className="font-mono font-semibold text-plum">{r.code}</span> }, { key: 'value', label: 'Discount', render: (r) => (r.discount_type === 'percent' ? `${r.value}%${r.max_discount ? ` (max ${inr(r.max_discount)})` : ''}` : inr(r.value)) }, { key: 'min_amount', label: 'Min order', render: (r) => inr(r.min_amount) }, { key: 'uses', label: 'Uses' }, { key: 'expires_at', label: 'Expires', render: (r) => (r.expires_at ? fmtDate(r.expires_at) : 'Never') }, { key: 'active', label: 'Status', render: (r) => <Badge status={r.active ? 'approved' : 'hidden'}>{r.active ? 'Active' : 'Inactive'}</Badge> }]}
          fields={[{ key: 'code', label: 'Code' }, { key: 'description', label: 'Description' }, { key: 'discount_type', label: 'Type', type: 'select', options: ['percent', 'flat'] }, { key: 'value', label: 'Value', type: 'number' }, { key: 'min_amount', label: 'Minimum order (₹)', type: 'number' }, { key: 'max_discount', label: 'Max discount (₹, percent only)', type: 'number' }, { key: 'expires_at', label: 'Expires on', type: 'date' }, { key: 'active', label: 'Active', type: 'boolean' }]}
          defaults={{ discount_type: 'percent', value: 10, min_amount: 0, active: true, uses: 0 }} search={['code', 'description']} query="&all=1" />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="blogs" element={<Crud type="blogs" title="article" query="&all=1" columns={[{ key: 'title', label: 'Title', render: (r) => <div className="flex items-center gap-3"><img src={r.cover} className="h-10 w-14 rounded-lg object-cover" alt="" /><b className="max-w-xs truncate">{r.title}</b></div> }, { key: 'category', label: 'Category' }, { key: 'author', label: 'Author' }, { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at) }, { key: 'published', label: 'Status', render: (r) => <Badge status={r.published ? 'published' : 'hidden'}>{r.published ? 'Published' : 'Draft'}</Badge> }]}
          fields={[{ key: 'title', label: 'Title' }, { key: 'slug', label: 'Slug (auto if blank)' }, { key: 'category', label: 'Category' }, { key: 'author', label: 'Author' }, { key: 'cover', label: 'Cover image', type: 'image', folder: 'blogs' }, { key: 'read_time', label: 'Read time (min)', type: 'number' }, { key: 'excerpt', label: 'Excerpt', type: 'textarea' }, { key: 'content', label: 'Content (paragraphs separated by new lines)', type: 'textarea', rows: 10 }, { key: 'published', label: 'Published', type: 'boolean' }]}
          defaults={{ published: true, read_time: 4, author: 'Astro Rahu Editorial', cover: '/blog/b1.jpg', category: 'Astrology' }} search={['title', 'category', 'author']} />} />
        <Route path="horoscope" element={<HoroscopePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="analytics" element={<AnalyticsPage stats={stats} />} />
      </Routes>
    </PanelShell>
  );
}

function Dashboard({ stats }: { stats: any }) {
  const { data: s, loading, error, reload } = stats;
  if (error) return <ErrorState message={error} onRetry={() => reload()} />;
  if (loading || !s) return <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={IndianRupee} label="Gross revenue" value={inr(s.gross)} sub={`Platform: ${inr(s.platform_earnings)} (${s.commission}%)`} tone="gold" />
        <StatCard icon={Users} label="Users" value={s.users} sub={`Wallet float ${inr(s.wallet_float)}`} tone="rose" />
        <StatCard icon={Star} label="Astrologers" value={s.astrologers} sub={`${s.online} online now`} tone="plum" />
        <StatCard icon={Radio} label="Live sessions" value={s.live} sub={`${s.consultations} total consultations`} tone="green" />
        <StatCard icon={CalendarDays} label="Bookings" value={s.bookings} sub={`${s.upcoming} upcoming`} tone="plum" />
        <StatCard icon={RotateCcw} label="Refunds" value={inr(s.refunds)} tone="rose" />
        <StatCard icon={Banknote} label="Pending payouts" value={inr(s.withdrawals_pending_amount)} sub={`${s.withdrawals_pending} requests`} tone="gold" />
        <StatCard icon={MessageSquareQuote} label="Avg. rating" value={s.avg_rating || '—'} sub={`${s.reviews} reviews`} tone="green" />
      </div>
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5">
        <div className="card p-6"><div className="flex items-center justify-between mb-3"><h2 className="font-serif text-xl font-semibold text-plum">Revenue · last 14 days</h2><TrendingUp className="h-5 w-5 text-gold" /></div><AreaChart data={s.revenue_series} prefix="₹" height={220} /></div>
        <div className="card p-6"><h2 className="font-serif text-xl font-semibold text-plum mb-5">Sessions by mode</h2><Donut data={s.by_mode} /></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3"><h2 className="font-serif text-xl font-semibold text-plum">Top astrologers</h2><Link to="/admin/astrologers" className="text-xs text-rose-deep">Manage</Link></div>
          {s.top_astrologers.map((a: any, i: number) => (
            <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0"><span className="w-5 text-sm text-muted">{i + 1}</span><img src={a.photo} className="h-10 w-10 rounded-xl object-cover" alt="" /><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{a.name}</p><p className="text-xs text-muted">★ {Number(a.rating).toFixed(1)} · {a.followers} followers</p></div><span className="text-sm font-medium">{a.orders_count.toLocaleString('en-IN')}</span><span className={`h-2 w-2 rounded-full ${a.is_online ? 'bg-emerald-500' : 'bg-stone-300'}`} /></div>
          ))}
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3"><h2 className="font-serif text-xl font-semibold text-plum">Recent transactions</h2><Link to="/admin/payments" className="text-xs text-rose-deep">View all</Link></div>
          {s.recent_transactions.length === 0 ? <p className="text-sm text-muted">No transactions yet.</p> : s.recent_transactions.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0"><div className="flex-1 min-w-0"><p className="text-sm truncate">{t.description}</p><p className="text-xs text-muted">{fmtDateTime(t.created_at)}</p></div><Badge status={t.type === 'refund' ? 'refunded' : t.type === 'credit' ? 'approved' : 'upcoming'}>{t.type}</Badge><span className="text-sm font-medium w-20 text-right">{inr(t.amount)}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface FieldDef { key: string; label: string; type?: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'date' | 'tags' | 'image'; options?: string[]; rows?: number; folder?: string }

function ImageField({ value, onChange, folder }: { value: string; onChange: (v: string) => void; folder?: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      {value ? <img src={value} className="h-10 w-10 rounded-lg object-cover shrink-0" alt="" /> : <span className="h-10 w-10 rounded-lg bg-cream shrink-0" />}
      <input className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Image URL or upload" />
      <label className="btn btn-outline btn-sm cursor-pointer shrink-0">{busy ? '…' : 'Upload'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { const r = await api('/api/admin', { method: 'POST', body: { action: 'upload_image', folder, base64: await fileToBase64(file), contentType: file.type, name: file.name } }); onChange(r.url); } catch (x: any) { toast(x.message, 'error'); } finally { setBusy(false); } }} /></label>
    </div>
  );
}

function FormModal({ open, onClose, title, fields, initial, onSubmit }: { open: boolean; onClose: () => void; title: string; fields: FieldDef[]; initial: any; onSubmit: (v: any) => Promise<void> }) {
  const [v, setV] = useState<any>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [lastInit, setLastInit] = useState(initial);
  if (initial !== lastInit) { setLastInit(initial); setV(initial); setErr(''); }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = fields.find((f) => (f.type || 'text') === 'text' && !['slug', 'description', 'max_discount'].includes(f.key) && !String(v[f.key] ?? '').trim());
    if (missing) { setErr(`${missing.label} is required`); return; }
    setBusy(true); setErr('');
    try { await onSubmit(v); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        {fields.map((f) => {
          const t = f.type || 'text';
          const full = t === 'textarea' || t === 'tags' || t === 'image';
          return (
            <div key={f.key} className={full ? 'sm:col-span-2' : ''}>
              {t === 'boolean' ? (
                <label className="flex items-center gap-3 mt-6"><input type="checkbox" checked={!!v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.checked })} className="h-4 w-4 accent-[#D9678A]" /><span className="text-sm">{f.label}</span></label>
              ) : (
                <Field label={f.label}>
                  {t === 'textarea' ? <textarea rows={f.rows || 3} className="input" value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} /> :
                    t === 'select' ? <select className="input" value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>{f.options!.map((o) => <option key={o} value={o}>{o}</option>)}</select> :
                    t === 'image' ? <ImageField value={v[f.key]} folder={f.folder} onChange={(url) => setV({ ...v, [f.key]: url })} /> :
                    t === 'tags' ? <div className="flex flex-wrap gap-1.5">{f.options!.map((o) => { const arr: string[] = v[f.key] || []; return <button type="button" key={o} onClick={() => setV({ ...v, [f.key]: arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o] })} className={`chip ${arr.includes(o) ? 'chip-active' : ''}`}>{o}</button>; })}</div> :
                    <input type={t === 'number' ? 'number' : t === 'date' ? 'date' : 'text'} step="any" className="input" value={t === 'date' ? String(v[f.key] ?? '').slice(0, 10) : v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: t === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : t === 'date' ? (e.target.value ? new Date(e.target.value).toISOString() : null) : e.target.value })} />}
                </Field>
              )}
            </div>
          );
        })}
        {err && <p className="sm:col-span-2 text-sm text-danger bg-rose-50 rounded-xl px-4 py-2">{err}</p>}
        <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="btn btn-outline">Cancel</button><button disabled={busy} className="btn btn-rose">{busy ? 'Saving…' : 'Save'}</button></div>
      </form>
    </Modal>
  );
}

function Crud({ type, title, columns, fields, defaults = {}, search = [], query = '' }: { type: string; title: string; columns: Column[]; fields: FieldDef[]; defaults?: any; search?: string[]; query?: string }) {
  const { data, loading, error, reload } = useApi<any[]>(`/api/content?type=${type}${query}`);
  const { toast } = useToast();
  const [edit, setEdit] = useState<any>(null);
  const [del, setDel] = useState<any>(null);
  const save = async (v: any) => {
    const body = { ...v };
    for (const k of ['astrologers', 'created_at']) if (k in body && k !== 'created_at') delete body[k];
    await api(`/api/content?type=${type}`, { method: v.id ? 'PUT' : 'POST', body });
    toast(`${title[0].toUpperCase() + title.slice(1)} ${v.id ? 'updated' : 'created'}`);
    setEdit(null); reload(true);
  };
  const remove = async () => { try { await api(`/api/content?type=${type}`, { method: 'DELETE', body: { id: del.id } }); toast(`${title} deleted`, 'info'); setDel(null); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  const cols: Column[] = [...columns, { key: '_actions', label: '', className: 'text-right', render: (r) => <div className="flex justify-end gap-1"><button onClick={() => setEdit(r)} className="h-8 w-8 rounded-full hover:bg-cream flex items-center justify-center" aria-label="Edit"><Pencil className="h-4 w-4" /></button><button onClick={() => setDel(r)} className="h-8 w-8 rounded-full hover:bg-rose-50 text-danger flex items-center justify-center" aria-label="Delete"><Trash2 className="h-4 w-4" /></button></div> }];
  return (
    <>
      <DataTable rows={data} columns={cols} loading={loading} error={error} onRetry={() => reload()} searchKeys={search} exportName={type} toolbar={<button onClick={() => setEdit({ ...defaults })} className="btn btn-rose btn-sm"><Plus className="h-4 w-4" /> New {title}</button>} />
      <FormModal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${title}` : `New ${title}`} fields={fields} initial={edit || {}} onSubmit={save} />
      <Modal open={!!del} onClose={() => setDel(null)} title={`Delete ${title}?`} size="sm"><p className="text-sm text-muted">This cannot be undone.</p><div className="grid grid-cols-2 gap-2 mt-5"><button onClick={() => setDel(null)} className="btn btn-outline">Cancel</button><button onClick={remove} className="btn btn-danger">Delete</button></div></Modal>
    </>
  );
}

function UsersPage() {
  const { data, loading, error, reload } = useApi<any[]>('/api/admin?section=users');
  const { toast } = useToast();
  const [adj, setAdj] = useState<any>(null);
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const update = async (body: any, msg: string) => { try { await api('/api/admin', { method: 'PUT', body: { section: 'users', ...body } }); toast(msg); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  return (
    <>
      <DataTable rows={data} loading={loading} error={error} onRetry={() => reload()} searchKeys={['full_name', 'email', 'phone']} exportName="users" emptyTitle="No users yet"
        columns={[
          { key: 'full_name', label: 'User', render: (r) => <div className="flex items-center gap-3"><Avatar src={r.avatar} name={r.full_name} size={34} /><div><p className="font-medium">{r.full_name}</p><p className="text-xs text-muted">{r.email}</p></div></div> },
          { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
          { key: 'role', label: 'Role', render: (r) => r.role === 'astrologer' ? <Badge status="upcoming">astrologer</Badge> : <select value={r.role} disabled={r.status === 'deleted'} onChange={(e) => update({ user_id: r.user_id, role: e.target.value }, `Role set to ${e.target.value}`)} className="input !py-1 !px-2 !w-auto text-xs"><option value="customer">customer</option><option value="admin">admin</option></select> },
          { key: 'wallet_balance', label: 'Wallet', render: (r) => (r.role === 'customer' ? <b>{inr(r.wallet_balance)}</b> : <span className="text-muted">—</span>) },
          { key: 'created_at', label: 'Joined', render: (r) => fmtDate(r.created_at) },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status === 'active' ? 'approved' : 'suspended'}>{r.status}</Badge> },
          { key: '_a', label: '', className: 'text-right', render: (r) => <div className="flex justify-end gap-1">{r.role === 'customer' && <button onClick={() => { setAdj(r); setAmt(''); setNote(''); }} className="btn btn-outline btn-sm">Wallet</button>}<button onClick={() => update({ user_id: r.user_id, status: r.status === 'active' ? 'suspended' : 'active' }, r.status === 'active' ? 'User suspended' : 'User reactivated')} className="btn btn-ghost btn-sm" title="Toggle status">{r.status === 'active' ? <Ban className="h-4 w-4 text-danger" /> : <Check className="h-4 w-4 text-success" />}</button></div> },
        ]} />
      <Modal open={!!adj} onClose={() => setAdj(null)} title="Adjust wallet" size="sm">
        {adj && <div className="space-y-4"><p className="text-sm text-muted">{adj.full_name} · current {inr(adj.wallet_balance)}</p><Field label="Amount (use negative to debit)"><input type="number" className="input" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field><Field label="Reason (required, audit logged)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Goodwill credit for dropped call" /></Field><p className="text-xs text-muted">Limited to ±₹10,000 per adjustment. Recorded in the immutable wallet ledger.</p><button onClick={async () => { if (!Number(amt)) { toast('Enter a non-zero amount', 'error'); return; } await update({ user_id: adj.user_id, wallet_delta: Number(amt), note }, 'Wallet adjusted'); setAdj(null); }} className="btn btn-rose w-full">Apply</button></div>}
      </Modal>
    </>
  );
}

function AstrologersPage() {
  const { data, loading, error, reload } = useApi<any[]>('/api/astrologers?status=all&sort=rating');
  const { toast } = useToast();
  const [edit, setEdit] = useState<any>(null);
  const upd = async (id: number, patch: any, msg: string) => { try { await api('/api/astrologers', { method: 'PUT', body: { id, ...patch } }); toast(msg); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  const fields: FieldDef[] = [{ key: 'name', label: 'Name' }, { key: 'title', label: 'Headline' }, { key: 'photo', label: 'Photo', type: 'image', folder: 'astrologers' }, { key: 'account_email', label: 'Linked login email (grants ASTROLOGER role)' }, { key: 'city', label: 'City' }, { key: 'gender', label: 'Gender', type: 'select', options: ['female', 'male'] }, { key: 'experience', label: 'Experience (yrs)', type: 'number' }, { key: 'chat_price', label: 'Chat ₹/min', type: 'number' }, { key: 'call_price', label: 'Call ₹/min', type: 'number' }, { key: 'video_price', label: 'Video ₹/min', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: ['active', 'suspended'] }, { key: 'expertise', label: 'Expertise', type: 'tags', options: EXPERTISE }, { key: 'languages', label: 'Languages', type: 'tags', options: LANGUAGES }, { key: 'bio', label: 'Bio', type: 'textarea', rows: 4 }, { key: 'verified', label: 'Verified', type: 'boolean' }, { key: 'featured', label: 'Featured', type: 'boolean' }];
  const save = async (v: any) => {
    const body = { ...v }; delete body.reviews; delete body.created_at;
    await api('/api/astrologers', { method: v.id ? 'PUT' : 'POST', body });
    toast(v.id ? 'Astrologer updated' : 'Astrologer added'); setEdit(null); reload(true);
  };
  return (
    <>
      <DataTable rows={data} loading={loading} error={error} onRetry={() => reload()} searchKeys={['name', 'title', 'city']} exportName="astrologers" toolbar={<button onClick={() => setEdit({ status: 'active', gender: 'female', experience: 5, chat_price: 25, call_price: 30, video_price: 40, expertise: [], languages: ['English', 'Hindi'], availability: { mon: { on: true, start: '10:00', end: '18:00' }, tue: { on: true, start: '10:00', end: '18:00' }, wed: { on: true, start: '10:00', end: '18:00' }, thu: { on: true, start: '10:00', end: '18:00' }, fri: { on: true, start: '10:00', end: '18:00' }, sat: { on: false, start: '10:00', end: '14:00' }, sun: { on: false, start: '10:00', end: '14:00' } }, photo: '/astrologers/a1.jpg' })} className="btn btn-rose btn-sm"><Plus className="h-4 w-4" /> Add astrologer</button>}
        columns={[
          { key: 'name', label: 'Astrologer', render: (r) => <div className="flex items-center gap-3"><img src={r.photo} className="h-10 w-10 rounded-xl object-cover" alt="" /><div><p className="font-medium flex items-center gap-1">{r.name}{r.verified && <Verified className="h-3.5 w-3.5" />}</p><p className="text-xs text-muted">{r.city} · {r.experience} yrs</p></div></div> },
          { key: 'rating', label: 'Rating', render: (r) => <span>★ {Number(r.rating).toFixed(1)} <span className="text-muted text-xs">({r.reviews_count})</span></span> },
          { key: 'orders_count', label: 'Consults', render: (r) => r.orders_count.toLocaleString('en-IN') },
          { key: 'chat_price', label: 'Rates', render: (r) => <span className="text-xs">{inr(r.chat_price)} / {inr(r.call_price)} / {inr(r.video_price)}</span> },
          { key: 'is_online', label: 'Online', render: (r) => <button onClick={() => upd(r.id, { is_online: !r.is_online }, r.is_online ? 'Set offline' : 'Set online')} className={`relative h-5 w-9 rounded-full ${r.is_online ? 'bg-emerald-500' : 'bg-line'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${r.is_online ? 'left-[18px]' : 'left-0.5'}`} /></button> },
          { key: 'kyc_status', label: 'KYC', render: (r) => <Badge status={r.kyc_status || 'not_submitted'} /> },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status === 'active' ? 'approved' : 'suspended'}>{r.status}</Badge> },
          { key: '_a', label: '', className: 'text-right', render: (r) => <div className="flex justify-end gap-1"><Link to={`/astrologer/${r.slug}`} className="h-8 w-8 rounded-full hover:bg-cream flex items-center justify-center" aria-label="View"><Eye className="h-4 w-4" /></Link><button onClick={() => setEdit(r)} className="h-8 w-8 rounded-full hover:bg-cream flex items-center justify-center" aria-label="Edit"><Pencil className="h-4 w-4" /></button><button onClick={() => upd(r.id, { featured: !r.featured }, r.featured ? 'Removed from featured' : 'Featured')} className={`h-8 w-8 rounded-full hover:bg-cream flex items-center justify-center ${r.featured ? 'text-gold' : 'text-muted'}`} aria-label="Feature"><Sparkles className="h-4 w-4" /></button></div> },
        ]} />
      <FormModal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit astrologer' : 'Add astrologer'} fields={fields} initial={edit || {}} onSubmit={save} />
    </>
  );
}

function KycPage({ onChange }: { onChange: () => void }) {
  const { data, loading, error, reload } = useApi<any[]>('/api/astrologers?status=all&sort=rating');
  const { toast } = useToast();
  const [tab, setTab] = useState('pending');
  const [view, setView] = useState<any>(null);
  const list = (data || []).filter((a) => (tab === 'all' ? true : (a.kyc_status || 'not_submitted') === tab));
  const act = async (a: any, status: string) => { try { await api('/api/admin', { method: 'PUT', body: { section: 'kyc', astrologer_id: a.id, status } }); toast(`KYC ${status} for ${a.name}`); setView(null); reload(true); onChange(); } catch (e: any) { toast(e.message, 'error'); } };
  return (
    <div className="space-y-5">
      <Tabs value={tab} onChange={setTab} tabs={['pending', 'approved', 'rejected', 'not_submitted', 'all'].map((k) => ({ key: k, label: k.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()), count: (data || []).filter((a) => k === 'all' || (a.kyc_status || 'not_submitted') === k).length }))} className="w-fit max-w-full" />
      <DataTable rows={list} loading={loading} error={error} onRetry={() => reload()} searchKeys={['name']} emptyTitle="No astrologers in this state"
        columns={[
          { key: 'name', label: 'Astrologer', render: (r) => <div className="flex items-center gap-3"><img src={r.photo} className="h-10 w-10 rounded-xl object-cover" alt="" /><b>{r.name}</b></div> },
          { key: 'pan', label: 'PAN', render: (r) => r.kyc_summary?.pan || '—' },
          { key: 'aadhaar', label: 'Aadhaar', render: (r) => r.kyc_summary?.aadhaar || '—' },
          { key: 'bank', label: 'Bank', render: (r) => (r.kyc_summary?.ifsc ? `${r.kyc_summary.ifsc} · ${r.kyc_summary.account_number}` : '—') },
          { key: 'submitted', label: 'Submitted', render: (r) => (r.kyc_summary?.submitted_at ? fmtDate(r.kyc_summary.submitted_at) : '—') },
          { key: 'kyc_status', label: 'Status', render: (r) => <Badge status={r.kyc_status || 'not_submitted'} /> },
          { key: '_a', label: '', className: 'text-right', render: (r) => <button onClick={() => setView(r)} className="btn btn-outline btn-sm"><Eye className="h-4 w-4" /> Review</button> },
        ]} />
      <Modal open={!!view} onClose={() => setView(null)} title="KYC review">
        {view && (
          <div className="space-y-4">
            <div className="flex items-center gap-3"><img src={view.photo} className="h-14 w-14 rounded-2xl object-cover" alt="" /><div><p className="font-serif text-xl font-semibold">{view.name}</p><Badge status={view.kyc_status || 'not_submitted'} /></div></div>
            {view.kyc_summary ? (
              <div className="rounded-2xl bg-cream/60 p-4 text-sm space-y-1.5">
                {[['PAN', view.kyc_summary.pan], ['Aadhaar', view.kyc_summary.aadhaar], ['Account holder', view.kyc_summary.account_name], ['Account', view.kyc_summary.account_number], ['IFSC', view.kyc_summary.ifsc]].map(([l, v]) => <div key={l} className="flex justify-between"><span className="text-muted">{l}</span><b>{v || '—'}</b></div>)}
                {view.has_kyc_docs && <button onClick={async () => { try { const r = await api(`/api/admin?section=kyc_doc&astrologer_id=${view.id}`); window.open(r.url, '_blank', 'noopener'); } catch (e: any) { toast(e.message, 'error'); } }} className="text-rose-deep font-medium inline-block mt-2">Open ID document (private link, expires in 5 min) ↗</button>}
              </div>
            ) : <p className="text-sm text-muted">No documents submitted yet.</p>}
            <div className="grid grid-cols-2 gap-2"><button onClick={() => act(view, 'rejected')} className="btn btn-outline !text-danger"><X className="h-4 w-4" /> Reject</button><button onClick={() => act(view, 'approved')} className="btn btn-rose"><Check className="h-4 w-4" /> Approve</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function BookingsPage() {
  const { data, loading, error, reload } = useApi<any[]>('/api/admin?section=bookings');
  const { toast } = useToast();
  const [tab, setTab] = useState('all');
  const set = async (id: number, status: string) => { try { await api('/api/admin', { method: 'PUT', body: { section: 'bookings', id, status } }); toast(`Booking ${status}`); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  const list = (data || []).filter((b) => tab === 'all' || b.status === tab);
  return (
    <div className="space-y-5">
      <Tabs value={tab} onChange={setTab} tabs={['all', 'upcoming', 'completed', 'cancelled', 'refunded'].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))} className="w-fit max-w-full" />
      <DataTable rows={list} loading={loading} error={error} onRetry={() => reload()} searchKeys={['user_name', 'reference', 'astrologers.name']} exportName="bookings"
        columns={[
          { key: 'reference', label: 'Ref', render: (r) => <span className="font-mono text-xs">{r.reference}</span> },
          { key: 'user_name', label: 'User' },
          { key: 'astro', label: 'Astrologer', render: (r) => r.astrologers?.name, exportValue: (r) => r.astrologers?.name },
          { key: 'mode', label: 'Mode', render: (r) => <span className="capitalize">{r.mode}</span> },
          { key: 'scheduled_at', label: 'Scheduled', render: (r) => fmtDateTime(r.scheduled_at) },
          { key: 'total', label: 'Amount', render: (r) => <span>{inr(r.total)}{r.discount > 0 && <span className="text-xs text-emerald-700 block">−{inr(r.discount)} {r.coupon_code}</span>}</span> },
          { key: 'payment_method', label: 'Paid via', render: (r) => <span className="uppercase text-xs">{r.payment_method}</span> },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
          { key: '_a', label: '', className: 'text-right', render: (r) => <div className="flex justify-end gap-1">{r.status === 'upcoming' && <button onClick={() => set(r.id, 'completed')} className="btn btn-outline btn-sm">Complete</button>}{['upcoming', 'completed', 'cancelled'].includes(r.status) && Number(r.refund_amount) < Number(r.total) && <button onClick={() => set(r.id, 'refunded')} className="btn btn-ghost btn-sm !text-danger" title="Refund"><RotateCcw className="h-4 w-4" /></button>}</div> },
        ]} />
    </div>
  );
}

function ConsultPage({ modes }: { modes: string }) {
  const { data, loading, error, reload } = useApi<any[]>(`/api/admin?section=consultations&mode=${modes}`, [modes]);
  const { toast } = useToast();
  const [view, setView] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[] | null>(null);
  const open = async (c: any) => { setView(c); setMsgs(null); try { setMsgs(await api(`/api/admin?section=messages&consultation_id=${c.id}`)); } catch { setMsgs([]); } };
  const forceEnd = async (id: number) => { try { await api('/api/admin', { method: 'PUT', body: { section: 'consultations', id } }); toast('Session closed'); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  return (
    <>
      <DataTable rows={data} loading={loading} error={error} onRetry={() => reload()} searchKeys={['user_name', 'astrologers.name']} exportName={modes === 'chat' ? 'chats' : 'calls'} emptyTitle="No sessions yet"
        columns={[
          { key: 'id', label: '#', render: (r) => <span className="text-muted">#{r.id}</span> },
          { key: 'user_name', label: 'User' },
          { key: 'astro', label: 'Astrologer', render: (r) => <div className="flex items-center gap-2"><img src={r.astrologers?.photo} className="h-7 w-7 rounded-full object-cover" alt="" />{r.astrologers?.name}</div>, exportValue: (r) => r.astrologers?.name },
          ...(modes !== 'chat' ? [{ key: 'mode', label: 'Type', render: (r: any) => <span className="capitalize">{r.mode}</span> }] : []),
          { key: 'started_at', label: 'Started', render: (r) => fmtDateTime(r.started_at) },
          { key: 'duration_sec', label: 'Duration', render: (r) => fmtDuration(r.duration_sec || 0) },
          { key: 'amount', label: 'Billed', render: (r) => (r.prepaid ? 'Prepaid' : inr(r.amount)) },
          { key: 'rating', label: 'Rating', render: (r) => (r.rating ? <Stars value={r.rating} size={11} /> : '—') },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
          { key: '_a', label: '', className: 'text-right', render: (r) => <div className="flex justify-end gap-1"><button onClick={() => open(r)} className="h-8 w-8 rounded-full hover:bg-cream flex items-center justify-center" aria-label="View"><Eye className="h-4 w-4" /></button>{r.status === 'active' && <button onClick={() => forceEnd(r.id)} className="btn btn-ghost btn-sm !text-danger">End</button>}</div> },
        ]} />
      <Modal open={!!view} onClose={() => setView(null)} title={`Session #${view?.id || ''} transcript`} size="lg">
        {!msgs ? <Skeleton className="h-40" /> : msgs.length === 0 ? <p className="text-sm text-muted">No messages.</p> : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">{msgs.map((m) => m.sender === 'system' ? <p key={m.id} className="text-center text-[11px] text-muted">{m.content}</p> : <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : ''}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender === 'user' ? 'bg-blush' : 'bg-cream'}`}>{m.kind === 'voice' ? <audio src={m.content} controls className="h-8" /> : m.content}<p className="text-[10px] text-muted mt-0.5">{m.sender} · {fmtTime(m.created_at)}</p></div></div>)}</div>
        )}
      </Modal>
    </>
  );
}

function GatewayPayments() {
  const { data, loading, error, reload } = useApi<any[]>('/api/admin?section=payments');
  const { toast } = useToast();
  const paid = (data || []).filter((p) => p.status === 'paid');
  const reconcile = async (id: number) => { try { const p = await api('/api/admin', { method: 'PUT', body: { section: 'payments', id } }); toast(p?.status === 'paid' ? 'Payment confirmed with provider and credited' : 'Provider has not confirmed this payment yet', p?.status === 'paid' ? 'success' : 'info'); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CreditCard} label="Collected" value={inr(paid.reduce((s, p) => s + Number(p.amount), 0))} tone="gold" />
        <StatCard icon={Check} label="Razorpay" value={paid.filter((p) => p.provider === 'razorpay').length} tone="green" />
        <StatCard icon={Check} label="Stripe" value={paid.filter((p) => p.provider === 'stripe').length} tone="plum" />
        <StatCard icon={RotateCcw} label="Pending / failed" value={(data || []).filter((p) => p.status !== 'paid').length} tone="rose" />
      </div>
      <DataTable rows={data} loading={loading} error={error} onRetry={() => reload()} searchKeys={['provider_order_id', 'provider_payment_id', 'user_id']} exportName="gateway-payments" emptyTitle="No gateway payments yet"
        columns={[
          { key: 'id', label: '#', render: (r) => <span className="text-muted">#{r.id}</span> },
          { key: 'provider', label: 'Provider', render: (r) => <span className="capitalize">{r.provider}</span> },
          { key: 'amount', label: 'Amount', render: (r) => <span><b>{inr(r.amount)}</b>{Number(r.bonus) > 0 && <span className="text-xs text-emerald-700 block">+{inr(r.bonus)} bonus</span>}</span> },
          { key: 'provider_order_id', label: 'Order / session', render: (r) => <span className="font-mono text-xs">{r.provider_order_id || '—'}</span> },
          { key: 'provider_payment_id', label: 'Payment ID', render: (r) => <span className="font-mono text-xs">{r.provider_payment_id || '—'}</span> },
          { key: 'created_at', label: 'Created', render: (r) => fmtDateTime(r.created_at) },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status === 'created' ? 'pending' : r.status === 'failed' ? 'rejected' : r.status} >{r.status}</Badge> },
          { key: '_a', label: '', className: 'text-right', render: (r) => (r.status !== 'paid' && ['razorpay', 'stripe'].includes(r.provider) ? <button onClick={() => reconcile(r.id)} className="btn btn-outline btn-sm">Reconcile</button> : null) },
        ]} />
    </div>
  );
}

function TxPage({ types, title }: { types: string; title: string }) {
  const { data, loading, error, reload } = useApi<any[]>(`/api/admin?section=transactions&type=${types}`, [types]);
  const total = (data || []).reduce((s, t) => s + Number(t.amount), 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4"><StatCard icon={CreditCard} label={`Total ${title}`} value={inr(total)} tone="gold" /><StatCard icon={FileBarChart} label="Transactions" value={(data || []).length} tone="plum" /></div>
      <DataTable rows={data} loading={loading} error={error} onRetry={() => reload()} searchKeys={['description', 'reference', 'user_id']} exportName={title}
        columns={[{ key: 'reference', label: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference}</span> }, { key: 'description', label: 'Description' }, { key: 'type', label: 'Type', render: (r) => <Badge status={r.type === 'refund' ? 'refunded' : r.type === 'credit' ? 'approved' : 'upcoming'}>{r.type}</Badge> }, { key: 'amount', label: 'Amount', render: (r) => <b>{inr(r.amount)}</b> }, { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> }, { key: 'created_at', label: 'Date', render: (r) => fmtDateTime(r.created_at) }]} />
    </div>
  );
}

function WalletPage() {
  const tx = useApi<any[]>('/api/admin?section=transactions&type=credit,refund');
  const users = useApi<any[]>('/api/admin?section=users');
  const float = (users.data || []).reduce((s, u) => s + Number(u.wallet_balance), 0);
  const recharges = (tx.data || []).filter((t) => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
  const refunds = (tx.data || []).filter((t) => t.type === 'refund').reduce((s, t) => s + Number(t.amount), 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Total wallet float" value={inr(float)} tone="gold" />
        <StatCard icon={Plus} label="Credits & recharges" value={inr(recharges)} tone="green" />
        <StatCard icon={RotateCcw} label="Refunds issued" value={inr(refunds)} tone="rose" />
        <StatCard icon={Users} label="Funded wallets" value={(users.data || []).filter((u) => Number(u.wallet_balance) > 0).length} tone="plum" />
      </div>
      <DataTable rows={tx.data} loading={tx.loading} error={tx.error} onRetry={() => tx.reload()} searchKeys={['description', 'reference']} exportName="wallet-credits"
        columns={[{ key: 'reference', label: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference}</span> }, { key: 'description', label: 'Description' }, { key: 'type', label: 'Type', render: (r) => <Badge status={r.type === 'refund' ? 'refunded' : 'approved'}>{r.type}</Badge> }, { key: 'amount', label: 'Amount', render: (r) => <b className="text-emerald-700">+{inr(r.amount)}</b> }, { key: 'created_at', label: 'Date', render: (r) => fmtDateTime(r.created_at) }]} />
    </div>
  );
}

function CommissionPage() {
  const { data, loading, error, reload } = useApi<any>('/api/admin?section=commission');
  const { toast } = useToast();
  const [rate, setRate] = useState<string>('');
  const save = async () => { const r = Number(rate); if (!(r >= 0 && r <= 90)) { toast('Enter 0–90%', 'error'); return; } try { await api('/api/admin', { method: 'PUT', body: { section: 'commission', rate: r } }); toast('Commission updated'); setRate(''); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  if (error) return <ErrorState message={error} onRetry={() => reload()} />;
  const totals = (data?.rows || []).reduce((s: any, r: any) => ({ gross: s.gross + r.gross, platform: s.platform + r.platform, payout: s.payout + r.payout }), { gross: 0, platform: 0, payout: 0 });
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-[1fr_2fr] gap-5">
        <div className="card gold-border p-6">
          <p className="label">Platform commission</p>
          <p className="font-display text-5xl text-gold-grad">{loading ? '—' : `${data.rate}%`}</p>
          <p className="text-sm text-muted mt-1">Deducted from every consultation and booking.</p>
          <div className="flex gap-2 mt-5"><input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="New rate %" className="input" /><button onClick={save} className="btn btn-rose">Update</button></div>
        </div>
        <div className="grid grid-cols-3 gap-4"><StatCard icon={IndianRupee} label="Gross" value={inr(totals.gross)} tone="plum" /><StatCard icon={Percent} label="Platform" value={inr(totals.platform)} tone="gold" /><StatCard icon={Banknote} label="Astrologer payouts" value={inr(totals.payout)} tone="green" /></div>
      </div>
      <DataTable rows={data?.rows || null} loading={loading} searchKeys={['name']} exportName="commission"
        columns={[{ key: 'name', label: 'Astrologer', render: (r) => <div className="flex items-center gap-2"><img src={r.photo} className="h-8 w-8 rounded-lg object-cover" alt="" /><b>{r.name}</b></div> }, { key: 'orders_count', label: 'Consults' }, { key: 'gross', label: 'Gross', render: (r) => inr(r.gross) }, { key: 'platform', label: 'Commission', render: (r) => <span className="text-gold-deep font-medium">{inr(r.platform)}</span> }, { key: 'payout', label: 'Payout', render: (r) => <b>{inr(r.payout)}</b> }]} />
    </div>
  );
}

function WithdrawalsPage({ onChange }: { onChange: () => void }) {
  const { data, loading, error, reload } = useApi<any[]>('/api/admin?section=withdrawals');
  const { toast } = useToast();
  const set = async (id: number, status: string) => { try { await api('/api/admin', { method: 'PUT', body: { section: 'withdrawals', id, status } }); toast(`Withdrawal ${status}`); reload(true); onChange(); } catch (e: any) { toast(e.message, 'error'); } };
  return (
    <DataTable rows={data} loading={loading} error={error} onRetry={() => reload()} searchKeys={['astrologers.name', 'method']} exportName="withdrawals" emptyTitle="No withdrawal requests"
      columns={[{ key: 'astro', label: 'Astrologer', render: (r) => <div className="flex items-center gap-2"><img src={r.astrologers?.photo} className="h-8 w-8 rounded-lg object-cover" alt="" /><b>{r.astrologers?.name}</b></div>, exportValue: (r) => r.astrologers?.name }, { key: 'amount', label: 'Amount', render: (r) => <b>{inr(r.amount)}</b> }, { key: 'method', label: 'Method' }, { key: 'created_at', label: 'Requested', render: (r) => fmtDateTime(r.created_at) }, { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
        { key: '_a', label: '', className: 'text-right', render: (r) => <div className="flex justify-end gap-1">{r.status === 'pending' && <><button onClick={() => set(r.id, 'approved')} className="btn btn-outline btn-sm"><Check className="h-4 w-4" /> Approve</button><button onClick={() => set(r.id, 'rejected')} className="btn btn-ghost btn-sm !text-danger"><X className="h-4 w-4" /></button></>}{r.status === 'approved' && <button onClick={() => set(r.id, 'paid')} className="btn btn-rose btn-sm">Mark paid</button>}</div> }]} />
  );
}

function ReviewsPage() {
  const { data, loading, error, reload } = useApi<any[]>('/api/reviews?scope=admin');
  const { toast } = useToast();
  const set = async (id: number, status: string) => { try { await api('/api/reviews', { method: 'PUT', body: { id, status } }); toast(`Review ${status}`); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  const del = async (id: number) => { try { await api('/api/reviews', { method: 'DELETE', body: { id } }); toast('Review deleted', 'info'); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  return (
    <DataTable rows={data} loading={loading} error={error} onRetry={() => reload()} searchKeys={['user_name', 'comment', 'astrologers.name']} exportName="reviews"
      columns={[{ key: 'user_name', label: 'User' }, { key: 'astro', label: 'Astrologer', render: (r) => r.astrologers?.name, exportValue: (r) => r.astrologers?.name }, { key: 'rating', label: 'Rating', render: (r) => <Stars value={r.rating} size={12} /> }, { key: 'comment', label: 'Comment', render: (r) => <p className="max-w-sm truncate" title={r.comment}>{r.comment || '—'}</p> }, { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at) }, { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
        { key: '_a', label: '', className: 'text-right', render: (r) => <div className="flex justify-end gap-1">{r.status !== 'published' ? <button onClick={() => set(r.id, 'published')} className="btn btn-outline btn-sm">Publish</button> : <button onClick={() => set(r.id, 'hidden')} className="btn btn-outline btn-sm">Hide</button>}<button onClick={() => del(r.id)} className="h-8 w-8 rounded-full hover:bg-rose-50 text-danger flex items-center justify-center" aria-label="Delete"><Trash2 className="h-4 w-4" /></button></div> }]} />
  );
}

function HoroscopePage() {
  const [period, setPeriod] = useState('daily');
  const { data, loading, error, reload } = useApi<any[]>(`/api/content?type=horoscopes&period=${period}`, [period]);
  const { toast } = useToast();
  const [edit, setEdit] = useState<any>(null);
  const save = async (v: any) => { const body = { ...v, updated_at: new Date().toISOString() }; await api('/api/content?type=horoscopes', { method: v.id ? 'PUT' : 'POST', body }); toast('Horoscope saved'); setEdit(null); reload(true); };
  const fields: FieldDef[] = [{ key: 'sign', label: 'Sign', type: 'select', options: SIGNS.map((s) => s.key) }, { key: 'period', label: 'Period', type: 'select', options: ['daily', 'weekly', 'monthly', 'yearly'] }, { key: 'overview', label: 'Overview', type: 'textarea' }, { key: 'love', label: 'Love', type: 'textarea' }, { key: 'career', label: 'Career', type: 'textarea' }, { key: 'finance', label: 'Finance', type: 'textarea' }, { key: 'health', label: 'Health', type: 'textarea' }, { key: 'love_score', label: 'Love %', type: 'number' }, { key: 'career_score', label: 'Career %', type: 'number' }, { key: 'finance_score', label: 'Finance %', type: 'number' }, { key: 'health_score', label: 'Health %', type: 'number' }, { key: 'lucky_number', label: 'Lucky number' }, { key: 'lucky_color', label: 'Lucky colour' }, { key: 'lucky_time', label: 'Lucky time' }, { key: 'mood', label: 'Mood' }, { key: 'compatibility', label: 'Compatible sign' }];
  const sorted = [...(data || [])].sort((a, b) => SIGNS.findIndex((s) => s.key === a.sign) - SIGNS.findIndex((s) => s.key === b.sign));
  return (
    <div className="space-y-5">
      <Tabs value={period} onChange={setPeriod} tabs={['daily', 'weekly', 'monthly', 'yearly'].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))} className="w-fit" />
      <DataTable rows={sorted} loading={loading} error={error} onRetry={() => reload()} searchKeys={['sign', 'overview']} exportName={`horoscope-${period}`} pageSize={12} toolbar={<button onClick={() => setEdit({ period, sign: 'aries', love_score: 75, career_score: 75, finance_score: 75, health_score: 75 })} className="btn btn-rose btn-sm"><Plus className="h-4 w-4" /> Add</button>}
        columns={[{ key: 'sign', label: 'Sign', render: (r) => { const s = SIGNS.find((x) => x.key === r.sign); return <span className="font-medium">{s?.glyph}︎ {s?.name}</span>; } }, { key: 'overview', label: 'Overview', render: (r) => <p className="max-w-md truncate">{r.overview}</p> }, { key: 'scores', label: 'L / C / F / H', render: (r) => <span className="text-xs">{r.love_score} / {r.career_score} / {r.finance_score} / {r.health_score}</span> }, { key: 'lucky_number', label: 'Lucky' }, { key: '_a', label: '', className: 'text-right', render: (r) => <button onClick={() => setEdit(r)} className="h-8 w-8 rounded-full hover:bg-cream flex items-center justify-center" aria-label="Edit"><Pencil className="h-4 w-4" /></button> }]} />
      <FormModal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit horoscope' : 'Add horoscope'} fields={fields} initial={edit || {}} onSubmit={save} />
    </div>
  );
}

function NotificationsPage() {
  const { data, loading, error, reload } = useApi<any[]>('/api/content?type=notifications');
  const { toast } = useToast();
  const [f, setF] = useState({ title: '', body: '', audience: 'all', type: 'promo' });
  const [busy, setBusy] = useState(false);
  const sendN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 3 || f.body.trim().length < 5) { toast('Add a title and message', 'error'); return; }
    setBusy(true);
    try { await api('/api/content?type=notifications', { method: 'POST', body: { ...f, user_id: null, read: false } }); toast('Broadcast sent'); setF({ title: '', body: '', audience: 'all', type: 'promo' }); reload(true); } catch (x: any) { toast(x.message, 'error'); } finally { setBusy(false); }
  };
  const del = async (id: number) => { try { await api('/api/content?type=notifications', { method: 'DELETE', body: { id } }); reload(true); } catch (x: any) { toast(x.message, 'error'); } };
  return (
    <div className="grid xl:grid-cols-[380px_1fr] gap-5">
      <form onSubmit={sendN} className="card gold-border p-6 h-fit space-y-4">
        <h2 className="font-serif text-xl font-semibold text-plum">Send broadcast</h2>
        <Field label="Audience"><select className="input" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="all">Everyone</option><option value="customer">Customers</option><option value="astrologer">Astrologers</option></select></Field>
        <Field label="Type"><select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['promo', 'horoscope', 'wallet', 'booking'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Message"><textarea rows={4} className="input" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <button disabled={busy} className="btn btn-rose w-full"><Megaphone className="h-4 w-4" /> {busy ? 'Sending…' : 'Send now'}</button>
      </form>
      <DataTable rows={data} loading={loading} error={error} onRetry={() => reload()} searchKeys={['title', 'body']} emptyTitle="No broadcasts yet"
        columns={[{ key: 'title', label: 'Title', render: (r) => <div><b>{r.title}</b><p className="text-xs text-muted max-w-sm truncate">{r.body}</p></div> }, { key: 'audience', label: 'Audience', render: (r) => <span className="capitalize">{r.audience}</span> }, { key: 'type', label: 'Type' }, { key: 'created_at', label: 'Sent', render: (r) => fmtDateTime(r.created_at) }, { key: '_a', label: '', className: 'text-right', render: (r) => <button onClick={() => del(r.id)} className="h-8 w-8 rounded-full hover:bg-rose-50 text-danger flex items-center justify-center" aria-label="Delete"><Trash2 className="h-4 w-4" /></button> }]} />
    </div>
  );
}

function SupportPage() {
  const { data, loading, error, reload } = useApi<any[]>('/api/admin?section=tickets');
  const { toast } = useToast();
  const set = async (id: number, status: string) => { try { await api('/api/admin', { method: 'PUT', body: { section: 'tickets', id, status } }); toast(`Ticket ${status}`); reload(true); } catch (e: any) { toast(e.message, 'error'); } };
  return (
    <DataTable rows={data} loading={loading} error={error} onRetry={() => reload()} searchKeys={['subject', 'message', 'category']} exportName="tickets" emptyTitle="No support tickets"
      columns={[{ key: 'subject', label: 'Subject', render: (r) => <div><b>{r.subject}</b><p className="text-xs text-muted max-w-md truncate" title={r.message}>{r.message}</p></div> }, { key: 'category', label: 'Category' }, { key: 'created_at', label: 'Raised', render: (r) => fmtDateTime(r.created_at) }, { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> }, { key: '_a', label: '', className: 'text-right', render: (r) => r.status === 'open' ? <button onClick={() => set(r.id, 'resolved')} className="btn btn-outline btn-sm"><Check className="h-4 w-4" /> Resolve</button> : <button onClick={() => set(r.id, 'open')} className="btn btn-ghost btn-sm">Reopen</button> }]} />
  );
}

function ReportsPage() {
  const comm = useApi<any>('/api/admin?section=commission');
  const bookings = useApi<any[]>('/api/admin?section=bookings');
  const cons = useApi<any[]>('/api/admin?section=consultations');
  const tx = useApi<any[]>('/api/admin?section=transactions');
  const loading = comm.loading || bookings.loading || cons.loading || tx.loading;
  if (loading) return <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>;
  const byMode = ['chat', 'audio', 'video'].map((m) => ({ label: m, value: Math.round((cons.data || []).filter((c) => c.mode === m).reduce((s, c) => s + Number(c.amount || 0), 0) + (bookings.data || []).filter((b) => b.mode === m && !['cancelled', 'refunded'].includes(b.status)).reduce((s, b) => s + Number(b.total), 0)) }));
  const byType = ['credit', 'debit', 'payment', 'refund'].map((t) => ({ label: t, value: Math.round((tx.data || []).filter((x) => x.type === t).reduce((s, x) => s + Number(x.amount), 0)) }));
  const reports = [
    { name: 'Revenue by astrologer', rows: comm.data?.rows || [], cols: [{ key: 'name', label: 'Astrologer' }, { key: 'gross', label: 'Gross' }, { key: 'platform', label: 'Commission' }, { key: 'payout', label: 'Payout' }] },
    { name: 'All bookings', rows: bookings.data || [], cols: [{ key: 'reference', label: 'Ref' }, { key: 'user_name', label: 'User' }, { key: 'mode', label: 'Mode' }, { key: 'scheduled_at', label: 'Scheduled' }, { key: 'total', label: 'Total' }, { key: 'status', label: 'Status' }] },
    { name: 'All consultations', rows: cons.data || [], cols: [{ key: 'id', label: 'ID' }, { key: 'user_name', label: 'User' }, { key: 'mode', label: 'Mode' }, { key: 'duration_sec', label: 'Seconds' }, { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' }] },
    { name: 'Ledger', rows: tx.data || [], cols: [{ key: 'reference', label: 'Ref' }, { key: 'type', label: 'Type' }, { key: 'amount', label: 'Amount' }, { key: 'description', label: 'Description' }, { key: 'created_at', label: 'Date' }] },
  ];
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-6"><h2 className="font-serif text-xl font-semibold text-plum mb-4">Revenue by mode</h2><BarList data={byMode} prefix="₹" /></div>
        <div className="card p-6"><h2 className="font-serif text-xl font-semibold text-plum mb-4">Ledger by type</h2><BarList data={byType} prefix="₹" color="bg-gold-grad" /></div>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {reports.map((r) => (
          <div key={r.name} className="card p-5 flex flex-col"><FileBarChart className="h-6 w-6 text-gold" /><p className="font-serif text-lg font-semibold text-plum mt-3">{r.name}</p><p className="text-sm text-muted flex-1">{r.rows.length} rows</p><button onClick={() => toCSV(r.rows, r.cols, r.name.toLowerCase().replace(/\s+/g, '-'))} disabled={!r.rows.length} className="btn btn-outline btn-sm mt-4">Download CSV</button></div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPage({ stats }: { stats: any }) {
  const s = stats.data;
  if (stats.error) return <ErrorState message={stats.error} onRetry={() => stats.reload()} />;
  if (!s) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="14-day revenue" value={inr(s.revenue_series.reduce((a: number, b: any) => a + b.value, 0))} tone="gold" />
        <StatCard icon={MessageCircle} label="14-day sessions" value={s.activity_series.reduce((a: number, b: any) => a + b.value, 0)} tone="rose" />
        <StatCard icon={UserCheck} label="Total users" value={s.users} tone="plum" />
        <StatCard icon={Star} label="Avg rating" value={s.avg_rating || '—'} tone="green" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-6"><h2 className="font-serif text-xl font-semibold text-plum mb-3">Revenue trend</h2><AreaChart data={s.revenue_series} prefix="₹" /></div>
        <div className="card p-6"><h2 className="font-serif text-xl font-semibold text-plum mb-3">Sessions & bookings</h2><AreaChart data={s.activity_series} color="#4A2358" /></div>
        <div className="card p-6"><h2 className="font-serif text-xl font-semibold text-plum mb-3">User growth</h2><AreaChart data={s.user_series} color="#C9A04A" /></div>
        <div className="card p-6"><h2 className="font-serif text-xl font-semibold text-plum mb-5">Rating distribution</h2><BarList data={s.rating_dist} color="bg-gold-grad" /></div>
      </div>
    </div>
  );
}
