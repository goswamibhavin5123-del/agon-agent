import { supabase, cors, send, httpError, requireRole, recomputeRating } from './_lib.js';

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const admin = req.query.scope === 'admin';
      if (admin) await requireRole(req, ['admin']);
      let q = supabase.from('reviews').select(admin ? '*, astrologers(id,name,photo)' : 'id, astrologer_id, rating, comment, user_name, created_at').order('created_at', { ascending: false }).limit(500);
      if (req.query.astrologer_id) q = q.eq('astrologer_id', req.query.astrologer_id);
      if (!admin) q = q.eq('status', 'published');
      else if (req.query.status) q = q.eq('status', req.query.status);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user, profile } = await requireRole(req, ['customer']);
      const { astrologer_id, rating, comment } = req.body || {};
      const r = Math.round(Number(rating));
      if (!(r >= 1 && r <= 5)) throw httpError(400, 'Please select a rating between 1 and 5');
      if (!comment || String(comment).trim().length < 10) throw httpError(400, 'Please write at least 10 characters');
      const [{ data: had }, { data: done }, { data: dup }] = await Promise.all([
        supabase.from('consultations').select('id').eq('user_id', user.id).eq('astrologer_id', astrologer_id).gt('minutes', 0).limit(1),
        supabase.from('bookings').select('id').eq('user_id', user.id).eq('astrologer_id', astrologer_id).eq('status', 'completed').limit(1),
        supabase.from('reviews').select('id').eq('user_id', user.id).eq('astrologer_id', astrologer_id).is('consultation_id', null).limit(1),
      ]);
      if (!had?.length && !done?.length) throw httpError(403, 'Only customers who have consulted this astrologer can leave a review');
      if (dup?.length) throw httpError(400, 'You have already reviewed this astrologer');
      const { data, error } = await supabase.from('reviews').insert({ astrologer_id, user_id: user.id, user_name: profile.full_name, rating: r, comment: String(comment).slice(0, 1000), status: 'published' }).select().single();
      if (error) throw error;
      await recomputeRating(astrologer_id);
      return res.status(201).json(data);
    }

    await requireRole(req, ['admin']);
    if (req.method === 'PUT') {
      const { id, status } = req.body || {};
      if (!['published', 'hidden', 'flagged'].includes(status)) throw httpError(400, 'Invalid status');
      const { data, error } = await supabase.from('reviews').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      await recomputeRating(data.astrologer_id);
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const { data: r } = await supabase.from('reviews').select('astrologer_id').eq('id', id).maybeSingle();
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
      if (r) await recomputeRating(r.astrologer_id);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    send(res, err);
  }
}
