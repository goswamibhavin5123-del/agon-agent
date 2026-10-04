import { supabase, cors, send, pick, httpError, requireRole, getUser, publicAstro } from './_lib.js';

const EDITABLE = ['name', 'slug', 'photo', 'title', 'bio', 'expertise', 'languages', 'experience', 'chat_price', 'call_price', 'video_price', 'is_online', 'verified', 'featured', 'status', 'gender', 'city', 'education', 'availability', 'videos'];
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function isAdmin(req) {
  const u = await getUser(req);
  if (!u) return false;
  const { data } = await supabase.from('profiles').select('role, status').eq('user_id', u.id).maybeSingle();
  return data?.role === 'admin' && data?.status === 'active';
}

/** Admin-only: link an astrologer record to a login account and grant the ASTROLOGER role. */
async function linkAccount(astroId, email) {
  if (email === undefined) return;
  const clean = String(email || '').trim().toLowerCase();
  const { data: current } = await supabase.from('astrologers').select('user_id').eq('id', astroId).single();
  if (!clean) {
    if (current?.user_id) { await supabase.from('astrologers').update({ user_id: null }).eq('id', astroId); await supabase.from('profiles').update({ role: 'customer' }).eq('user_id', current.user_id).eq('role', 'astrologer'); }
    return;
  }
  const { data: prof } = await supabase.from('profiles').select('user_id, role').ilike('email', clean).maybeSingle();
  if (!prof) throw httpError(400, 'No account found with that email. Ask the astrologer to sign up first.');
  if (prof.role === 'admin') throw httpError(400, 'Admin accounts cannot be linked to an astrologer profile');
  const { data: other } = await supabase.from('astrologers').select('id').eq('user_id', prof.user_id).neq('id', astroId).maybeSingle();
  if (other) throw httpError(400, 'That account is already linked to another astrologer');
  await supabase.from('astrologers').update({ user_id: prof.user_id }).eq('id', astroId);
  await supabase.from('profiles').update({ role: 'astrologer' }).eq('user_id', prof.user_id);
}

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const admin = req.query.status === 'all' ? await isAdmin(req) : false;
      if (req.query.status === 'all' && !admin) throw httpError(403, 'Admin access required');
      const { id, slug } = req.query;
      if (id || slug) {
        let q = supabase.from('astrologers').select('*');
        q = id ? q.eq('id', id) : q.eq('slug', slug);
        const { data: astro, error } = await q.maybeSingle();
        if (error) throw error;
        if (!astro || (astro.status !== 'active' && !admin)) throw httpError(404, 'Astrologer not found');
        const { data: reviews } = await supabase.from('reviews').select('id, rating, comment, user_name, created_at').eq('astrologer_id', astro.id).eq('status', 'published').order('created_at', { ascending: false }).limit(60);
        return res.status(200).json({ ...publicAstro(astro), reviews: reviews || [] });
      }
      const { data, error } = await supabase.from('astrologers').select('*').order('rating', { ascending: false });
      if (error) throw error;
      let list = data || [];
      const { q, online, expertise, language, gender, min_rating, max_price, min_exp, sort, featured, limit } = req.query;
      if (!admin) list = list.filter((a) => a.status === 'active');
      if (q) { const s = String(q).toLowerCase(); list = list.filter((a) => [a.name, a.title, a.city, ...(a.expertise || []), ...(a.languages || [])].join(' ').toLowerCase().includes(s)); }
      if (online === 'true') list = list.filter((a) => a.is_online);
      if (expertise) { const ex = String(expertise).split(','); list = list.filter((a) => ex.some((e) => (a.expertise || []).includes(e))); }
      if (language) { const ls = String(language).split(','); list = list.filter((a) => ls.some((l) => (a.languages || []).includes(l))); }
      if (gender) list = list.filter((a) => a.gender === gender);
      if (min_rating) list = list.filter((a) => Number(a.rating) >= Number(min_rating));
      if (max_price) list = list.filter((a) => Number(a.chat_price) <= Number(max_price));
      if (min_exp) list = list.filter((a) => Number(a.experience) >= Number(min_exp));
      if (featured === 'true') list = list.filter((a) => a.featured);
      const sorters = {
        rating: (a, b) => b.rating - a.rating, price_low: (a, b) => a.chat_price - b.chat_price, price_high: (a, b) => b.chat_price - a.chat_price,
        experience: (a, b) => b.experience - a.experience, orders: (a, b) => b.orders_count - a.orders_count,
        recommended: (a, b) => Number(b.is_online) - Number(a.is_online) || Number(b.featured) - Number(a.featured) || b.rating - a.rating,
      };
      list.sort(sorters[sort] || sorters.recommended);
      if (limit) list = list.slice(0, Number(limit));
      if (admin) {
        const ids = list.map((a) => a.user_id).filter(Boolean);
        const { data: profs } = ids.length ? await supabase.from('profiles').select('user_id, email').in('user_id', ids) : { data: [] };
        return res.status(200).json(list.map(({ kyc_docs, ...a }) => ({ ...a, has_kyc_docs: !!kyc_docs, kyc_summary: kyc_docs ? pick(kyc_docs, ['pan', 'aadhaar', 'account_name', 'account_number', 'ifsc', 'submitted_at']) : null, account_email: (profs || []).find((p) => p.user_id === a.user_id)?.email || '' })));
      }
      return res.status(200).json(list.map(publicAstro));
    }

    await requireRole(req, ['admin']);

    if (req.method === 'POST') {
      const row = pick(req.body, EDITABLE);
      if (!row.name) throw httpError(400, 'Name is required');
      row.slug = row.slug || `${slugify(row.name)}-${Math.random().toString(36).slice(2, 5)}`;
      Object.assign(row, { rating: 5, reviews_count: 0, orders_count: 0, followers: 0, status: row.status || 'active', kyc_status: 'not_submitted', expertise: row.expertise || [], languages: row.languages || ['English'] });
      const { data, error } = await supabase.from('astrologers').insert(row).select().single();
      if (error) throw error;
      await linkAccount(data.id, req.body.account_email);
      return res.status(201).json(publicAstro(data));
    }
    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) throw httpError(400, 'id is required');
      const { data, error } = await supabase.from('astrologers').update(pick(req.body, EDITABLE)).eq('id', id).select().single();
      if (error) throw error;
      await linkAccount(id, req.body.account_email);
      return res.status(200).json(publicAstro(data));
    }
    if (req.method === 'DELETE') {
      const { data: a } = await supabase.from('astrologers').select('user_id').eq('id', req.body.id).maybeSingle();
      const { error } = await supabase.from('astrologers').delete().eq('id', req.body.id);
      if (error) throw error;
      if (a?.user_id) await supabase.from('profiles').update({ role: 'customer' }).eq('user_id', a.user_id).eq('role', 'astrologer');
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    send(res, err);
  }
}
