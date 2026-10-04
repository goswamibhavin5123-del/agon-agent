import crypto from 'crypto';
import { supabase, cors, send, httpError, pick, requireRole, getCommission, lastNDays, dayKey, round2, settle, sweepActive, signMessages, livekitConfigured, livekitToken, uploadPublicImage } from './_lib.js';

async function earnings(astroId) {
  const rate = await getCommission();
  const [c, b, w] = await Promise.all([
    supabase.from('consultations').select('id, amount, created_at').eq('astrologer_id', astroId),
    supabase.from('bookings').select('id, total, created_at, status').eq('astrologer_id', astroId),
    supabase.from('withdrawals').select('*').eq('astrologer_id', astroId).order('created_at', { ascending: false }),
  ]);
  const items = [
    ...(c.data || []).filter((x) => Number(x.amount) > 0).map((x) => ({ amount: Number(x.amount), created_at: x.created_at })),
    ...(b.data || []).filter((x) => x.status !== 'cancelled' && x.status !== 'refunded').map((x) => ({ amount: Number(x.total), created_at: x.created_at })),
  ];
  const gross = round2(items.reduce((s, x) => s + x.amount, 0));
  const net = round2((gross * (100 - rate)) / 100);
  const withdrawals = w.data || [];
  const withdrawn = round2(withdrawals.filter((x) => x.status !== 'rejected').reduce((s, x) => s + Number(x.amount), 0));
  const today = new Date().toISOString().slice(0, 10);
  const series = lastNDays(14).map((d) => ({ label: d.slice(5), value: round2((items.filter((x) => dayKey(x.created_at) === d).reduce((s, x) => s + x.amount, 0) * (100 - rate)) / 100) }));
  return { commission: rate, gross, net, withdrawn, available: round2(net - withdrawn), today: round2((items.filter((x) => dayKey(x.created_at) === today).reduce((s, x) => s + x.amount, 0) * (100 - rate)) / 100), series, withdrawals };
}

async function ownConsult(id, astroId) {
  const { data: c } = await supabase.from('consultations').select('*').eq('id', id).maybeSingle();
  if (!c) throw httpError(404, 'Consultation not found');
  if (c.astrologer_id !== astroId) throw httpError(403, 'This consultation belongs to another astrologer');
  return c;
}

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  try {
    // The astrologer is ALWAYS derived from the signed-in account — never from client input.
    const { astrologer: me } = await requireRole(req, ['astrologer']);
    const id = me.id;

    if (req.method === 'GET') {
      if (req.query.section === 'messages') {
        const c = await ownConsult(Number(req.query.consultation_id), id);
        const { data, error } = await supabase.from('messages').select('*').eq('consultation_id', c.id).lte('created_at', new Date().toISOString()).order('id');
        if (error) throw error;
        return res.status(200).json(await signMessages(data || []));
      }
      await sweepActive({ astrologer_id: id });
      const { data: astro } = await supabase.from('astrologers').select('*').eq('id', id).single();
      const [live, bookings, cons, reviews, notifs, favs, earn] = await Promise.all([
        supabase.from('consultations').select('*').eq('astrologer_id', id).eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, services(name)').eq('astrologer_id', id).order('scheduled_at', { ascending: false }),
        supabase.from('consultations').select('*').eq('astrologer_id', id).neq('status', 'active').order('created_at', { ascending: false }).limit(100),
        supabase.from('reviews').select('id, rating, comment, user_name, status, created_at').eq('astrologer_id', id).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').or(`astrologer_id.eq.${id},and(user_id.is.null,astrologer_id.is.null,audience.in.(all,astrologer))`).order('created_at', { ascending: false }).limit(60),
        supabase.from('favorites').select('user_id, created_at').eq('astrologer_id', id).order('created_at', { ascending: false }),
        earnings(id),
      ]);
      const favRows = favs.data || [];
      let followers = [];
      if (favRows.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name, avatar, zodiac').in('user_id', favRows.map((f) => f.user_id));
        followers = favRows.map((f, i) => { const p = (profs || []).find((x) => x.user_id === f.user_id); return { key: `f${i}`, created_at: f.created_at, profile: p ? { full_name: p.full_name, avatar: p.avatar, zodiac: p.zodiac } : null }; });
      }
      const liveIds = (live.data || []).map((c) => c.id);
      const { data: sessions } = liveIds.length ? await supabase.from('consultation_sessions').select('consultation_id, connected_at').in('consultation_id', liveIds) : { data: [] };
      const strip = (c) => { const { user_id, ...rest } = c; return rest; };
      const { kyc_docs, user_id, ...safeAstro } = astro;
      return res.status(200).json({
        astrologer: { ...safeAstro, kyc_summary: kyc_docs ? pick(kyc_docs, ['pan', 'aadhaar', 'account_number', 'ifsc', 'submitted_at']) : null },
        live: (live.data || []).map((c) => ({ ...strip(c), connected_at: (sessions || []).find((s) => s.consultation_id === c.id)?.connected_at || null })),
        bookings: (bookings.data || []).map(strip), consultations: (cons.data || []).map(strip), reviews: reviews.data || [], notifications: notifs.data || [], followers, earnings: earn, calls_enabled: livekitConfigured(),
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { action } = req.body || {};

    if (action === 'toggle_online') {
      const { data, error } = await supabase.from('astrologers').update({ is_online: !!req.body.is_online }).eq('id', id).select('id, is_online').single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (action === 'update_profile') {
      const fields = pick(req.body.fields || {}, ['name', 'title', 'bio', 'photo', 'expertise', 'languages', 'experience', 'chat_price', 'call_price', 'video_price', 'city', 'education', 'gender', 'settings']);
      for (const k of ['chat_price', 'call_price', 'video_price']) if (fields[k] !== undefined && !(Number(fields[k]) >= 5 && Number(fields[k]) <= 1000)) throw httpError(400, 'Per-minute rates must be between ₹5 and ₹1,000');
      const { error } = await supabase.from('astrologers').update(fields).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (action === 'upload_photo') {
      const url = await uploadPublicImage(`astrologers/${id}`, req.body);
      await supabase.from('astrologers').update({ photo: url }).eq('id', id);
      return res.status(200).json({ url });
    }
    if (action === 'availability') {
      const { error } = await supabase.from('astrologers').update({ availability: req.body.availability }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (action === 'upload_doc') {
      const { base64, contentType, name } = req.body;
      if (!base64) throw httpError(400, 'No file received');
      if (!/^(application\/pdf|image\/(png|jpe?g|webp))$/.test(String(contentType))) throw httpError(400, 'Upload a PDF, JPG, PNG or WEBP file');
      const buf = Buffer.from(base64, 'base64');
      if (buf.length > 3 * 1024 * 1024) throw httpError(400, 'File must be under 3 MB');
      const path = `${id}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${String(name || 'doc').replace(/[^a-zA-Z0-9.]/g, '_').slice(-40)}`;
      const { error } = await supabase.storage.from('kyc-docs').upload(path, buf, { contentType });
      if (error) throw error;
      return res.status(200).json({ path, name });
    }
    if (action === 'kyc_submit') {
      const docs = req.body.docs || {};
      if (!docs.pan || !docs.aadhaar || !docs.account_number || !docs.ifsc || !docs.account_name) throw httpError(400, 'Please complete all KYC fields');
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(docs.pan).toUpperCase())) throw httpError(400, 'PAN format looks invalid (e.g. ABCDE1234F)');
      if (!/^\d{12}$/.test(String(docs.aadhaar).replace(/\s/g, ''))) throw httpError(400, 'Aadhaar must be 12 digits');
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(docs.ifsc).toUpperCase())) throw httpError(400, 'IFSC format looks invalid');
      if (docs.id_path && !String(docs.id_path).startsWith(`${id}/`)) throw httpError(400, 'Invalid document reference');
      const safe = { pan: String(docs.pan).toUpperCase(), aadhaar: 'XXXX XXXX ' + String(docs.aadhaar).replace(/\s/g, '').slice(-4), account_name: String(docs.account_name).slice(0, 120), account_number: 'XXXXXX' + String(docs.account_number).slice(-4), ifsc: String(docs.ifsc).toUpperCase(), id_path: docs.id_path || null, submitted_at: new Date().toISOString() };
      const { data: cur } = await supabase.from('astrologers').select('kyc_status').eq('id', id).single();
      if (cur.kyc_status === 'approved' || cur.kyc_status === 'pending') throw httpError(400, 'Your KYC is already submitted');
      const { error } = await supabase.from('astrologers').update({ kyc_status: 'pending', kyc_docs: safe }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (action === 'withdraw') {
      const amount = Math.round(Number(req.body.amount));
      if (!amount || amount < 500) throw httpError(400, 'Minimum withdrawal is ₹500');
      if (me.kyc_status !== 'approved') throw httpError(403, 'Complete KYC before requesting a withdrawal');
      const { data: pending } = await supabase.from('withdrawals').select('id').eq('astrologer_id', id).eq('status', 'pending').limit(1);
      if (pending?.length) throw httpError(409, 'You already have a pending withdrawal');
      const e = await earnings(id);
      if (amount > e.available) throw httpError(400, `You can withdraw up to ₹${e.available}`);
      const { data, error } = await supabase.from('withdrawals').insert({ astrologer_id: id, amount, method: req.body.method === 'UPI' ? 'UPI' : 'Bank transfer', status: 'pending' }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (action === 'reply') {
      const c = await ownConsult(Number(req.body.consultation_id), id);
      const content = String(req.body.content || '').trim();
      if (!content) throw httpError(400, 'Message is empty');
      if (c.status !== 'active') throw httpError(400, 'This consultation has ended');
      if (/(\+?\d[\d\s-]{8,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|(https?:\/\/\S+)/i.test(content)) throw httpError(400, 'Sharing contact details or links is not allowed');
      await supabase.from('consultations').update({ auto_reply: false }).eq('id', c.id);
      await supabase.from('messages').delete().eq('consultation_id', c.id).eq('sender', 'astrologer').gt('created_at', new Date().toISOString());
      const { data, error } = await supabase.from('messages').insert({ consultation_id: c.id, sender: 'astrologer', kind: 'text', content: content.slice(0, 4000) }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (action === 'call_token') {
      const c = await ownConsult(Number(req.body.consultation_id), id);
      if (c.mode === 'chat' || c.status !== 'active') throw httpError(400, 'This call is not active');
      if (!livekitConfigured()) throw httpError(503, 'Calling is not configured');
      const room = `av-consult-${c.id}`;
      return res.status(200).json({ token: livekitToken({ identity: `astro-${id}`, name: me.name, grants: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true }, ttl: 2 * 3600 }), url: process.env.LIVEKIT_URL, room });
    }
    if (action === 'call_status') {
      const c = await ownConsult(Number(req.body.consultation_id), id);
      const r = await settle(c.id);
      return res.status(200).json({ status: r.c.status, minutes: r.c.minutes, connected_at: r.s?.connected_at || null, end_reason: r.s?.end_reason || null, server_now: new Date().toISOString() });
    }
    if (action === 'end_consultation') {
      const c = await ownConsult(Number(req.body.consultation_id), id);
      const r = await settle(c.id, { end: true, reason: 'astrologer' });
      return res.status(200).json({ status: r.c.status });
    }
    if (action === 'booking_status') {
      if (req.body.status !== 'completed') throw httpError(400, 'Invalid status');
      const { data, error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', req.body.id).eq('astrologer_id', id).eq('status', 'upcoming').lt('scheduled_at', new Date().toISOString()).select('id, status').maybeSingle();
      if (error) throw error;
      if (!data) throw httpError(400, 'Only past upcoming bookings can be completed');
      return res.status(200).json(data);
    }
    if (action === 'read_notifications') {
      await supabase.from('notifications').update({ read: true }).eq('astrologer_id', id);
      return res.status(200).json({ ok: true });
    }
    throw httpError(400, 'Unknown action');
  } catch (err) {
    send(res, err);
  }
}
