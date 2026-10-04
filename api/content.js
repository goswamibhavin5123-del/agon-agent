import { supabase, cors, getUser, send, httpError, evaluateCoupon, requireRole } from './_lib.js';

const TABLES = {
  services: { order: 'sort_order' },
  testimonials: { order: 'id' },
  blogs: { order: 'created_at', desc: true },
  horoscopes: { order: 'id' },
  coupons: { order: 'id' },
  notifications: { order: 'created_at', desc: true },
  settings: { order: 'key', pk: 'key' },
};

async function isAdmin(req) {
  const u = await getUser(req);
  if (!u) return false;
  const { data } = await supabase.from('profiles').select('role, status').eq('user_id', u.id).maybeSingle();
  return data?.role === 'admin' && data?.status === 'active';
}

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  try {
    const type = req.query.type;
    if (req.method === 'GET' && type === 'coupon_check') {
      const result = await evaluateCoupon(req.query.code, req.query.amount);
      return res.status(200).json(result);
    }
    const cfg = TABLES[type];
    if (!cfg) throw httpError(400, 'Unknown content type');

    if (req.method === 'GET') {
      const all = req.query.all === '1';
      if ((all || type === 'settings') && !(await isAdmin(req))) throw httpError(403, 'Admin access required');
      const cols = type === 'coupons' && !all ? 'id, code, description, discount_type, value, min_amount, max_discount, expires_at' : '*';
      let q = supabase.from(type).select(cols).order(cfg.order, { ascending: !cfg.desc });
      const { sign, period, slug, limit } = req.query;
      if (type === 'horoscopes') { if (sign) q = q.eq('sign', sign); if (period) q = q.eq('period', period); }
      if (type === 'blogs') { if (slug) q = q.eq('slug', slug); if (!all) q = q.eq('published', true); }
      if (type === 'services' && !all) q = q.eq('active', true);
      if (type === 'coupons' && !all) q = q.eq('active', true);
      if (type === 'notifications') { q = q.is('user_id', null).is('astrologer_id', null); if (!all) q = q.in('audience', ['all', 'customer']); }
      if (limit) q = q.limit(Number(limit));
      const { data, error } = await q;
      if (error) throw error;
      if (type === 'blogs' && slug) {
        if (!data?.length) throw httpError(404, 'Article not found');
        return res.status(200).json(data[0]);
      }
      return res.status(200).json(data);
    }

    await requireRole(req, ['admin']);
    const pk = cfg.pk || 'id';

    if (req.method === 'POST') {
      const row = { ...req.body };
      delete row.id;
      if (type === 'coupons' && row.code) row.code = String(row.code).toUpperCase().trim();
      if (type === 'blogs' && !row.slug && row.title) row.slug = String(row.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (type === 'notifications') { row.user_id = null; row.astrologer_id = null; }
      const { data, error } = type === 'settings' ? await supabase.from(type).upsert(row).select().single() : await supabase.from(type).insert(row).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const row = { ...req.body };
      const id = row[pk];
      if (id === undefined) throw httpError(400, `${pk} is required`);
      delete row[pk];
      if (type === 'coupons' && row.code) row.code = String(row.code).toUpperCase().trim();
      const { data, error } = await supabase.from(type).update(row).eq(pk, id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { error } = await supabase.from(type).delete().eq(pk, req.body?.[pk]);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    send(res, err);
  }
}
