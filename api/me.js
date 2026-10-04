import { supabase, cors, send, pick, httpError, requireRole, getUser, ensureProfile, getBalance, ledgerToTx, sweepActive, uploadPublicImage, clientIp } from './_lib.js';

const TERMS_VERSION = '2026-09';

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  try {
    // Profile + role + consent recording are available to every signed-in role.
    if (req.method === 'GET' && (req.query.section || 'profile') === 'profile') {
      const user = await getUser(req);
      if (!user) throw httpError(401, 'Please sign in to continue');
      const profile = await ensureProfile(user);
      const out = { ...profile, role: ['customer', 'astrologer', 'admin'].includes(profile.role) ? profile.role : 'customer' };
      if (out.role === 'customer') out.wallet_balance = await getBalance(user.id);
      if (out.role === 'astrologer') {
        const { data: a } = await supabase.from('astrologers').select('id, name, slug, photo').eq('user_id', user.id).maybeSingle();
        out.astrologer = a || null;
      }
      const { data: consent } = await supabase.from('consents').select('version').eq('user_id', user.id).eq('kind', 'terms').order('created_at', { ascending: false }).limit(1);
      out.terms_accepted = consent?.[0]?.version === TERMS_VERSION;
      out.terms_version = TERMS_VERSION;
      return res.status(200).json(out);
    }
    if (req.method === 'POST' && req.body?.action === 'consent') {
      const user = await getUser(req);
      if (!user) throw httpError(401, 'Please sign in to continue');
      const kinds = (req.body.kinds || ['terms', 'privacy', 'age18']).filter((k) => ['terms', 'privacy', 'age18', 'marketing'].includes(k));
      await supabase.from('consents').insert(kinds.map((k) => ({ user_id: user.id, kind: k, version: TERMS_VERSION, ip: clientIp(req), user_agent: String(req.headers['user-agent'] || '').slice(0, 300) })));
      return res.status(200).json({ ok: true });
    }

    const { user, profile } = await requireRole(req, ['customer']);
    const uid = user.id;

    if (req.method === 'GET') {
      const section = req.query.section;
      if (section === 'summary') {
        await sweepActive({ user_id: uid });
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const [bk, cs, fav, notif, tx, astros, balance] = await Promise.all([
          supabase.from('bookings').select('*, astrologers(id,name,photo,slug,title)').eq('user_id', uid).eq('status', 'upcoming').gte('scheduled_at', since).order('scheduled_at').limit(5),
          supabase.from('consultations').select('*, astrologers(id,name,photo,slug,title)').eq('user_id', uid).order('created_at', { ascending: false }).limit(6),
          supabase.from('favorites').select('astrologer_id').eq('user_id', uid),
          supabase.from('notifications').select('id').eq('user_id', uid).eq('read', false),
          supabase.from('wallet_ledger').select('*').eq('user_id', uid).order('seq', { ascending: false }).limit(5),
          supabase.from('astrologers').select('id,name,slug,photo,title,expertise,languages,experience,rating,reviews_count,orders_count,chat_price,call_price,video_price,is_online,verified,featured').eq('status', 'active').order('rating', { ascending: false }),
          getBalance(uid),
        ]);
        const favIds = (fav.data || []).map((f) => f.astrologer_id);
        const recs = (astros.data || []).filter((a) => !favIds.includes(a.id)).sort((a, b) => Number(b.is_online) - Number(a.is_online) || b.rating - a.rating).slice(0, 6);
        return res.status(200).json({ profile: { ...profile, wallet_balance: balance }, upcoming: bk.data || [], consultations: cs.data || [], favorite_ids: favIds, unread: (notif.data || []).length, transactions: (tx.data || []).map(ledgerToTx), recommendations: recs });
      }
      if (section === 'favorites') {
        const { data, error } = await supabase.from('favorites').select('*, astrologers(id,name,slug,photo,title,expertise,languages,experience,rating,reviews_count,orders_count,chat_price,call_price,video_price,is_online,verified)').eq('user_id', uid).order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (section === 'favorite_ids') {
        const { data } = await supabase.from('favorites').select('astrologer_id').eq('user_id', uid);
        return res.status(200).json((data || []).map((f) => f.astrologer_id));
      }
      if (section === 'notifications') {
        const { data, error } = await supabase.from('notifications').select('*').or(`user_id.eq.${uid},and(user_id.is.null,astrologer_id.is.null,audience.in.(all,customer))`).order('created_at', { ascending: false }).limit(60);
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (section === 'transactions') {
        const { data, error } = await supabase.from('wallet_ledger').select('*').eq('user_id', uid).order('seq', { ascending: false }).limit(300);
        if (error) throw error;
        return res.status(200).json((data || []).map(ledgerToTx));
      }
      if (section === 'tickets') {
        const { data, error } = await supabase.from('support_tickets').select('*').eq('user_id', uid).order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (section === 'kundli') {
        const { data, error } = await supabase.from('kundlis').select('*').eq('user_id', uid).order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (section === 'export') {
        const [bk, cs, ledger, kd, fav, tk, pay, cons] = await Promise.all([
          supabase.from('bookings').select('*').eq('user_id', uid), supabase.from('consultations').select('*').eq('user_id', uid),
          supabase.from('wallet_ledger').select('*').eq('user_id', uid).order('seq'), supabase.from('kundlis').select('*').eq('user_id', uid),
          supabase.from('favorites').select('astrologer_id, created_at').eq('user_id', uid), supabase.from('support_tickets').select('*').eq('user_id', uid),
          supabase.from('payments').select('id, provider, amount, bonus, status, created_at, paid_at').eq('user_id', uid), supabase.from('consents').select('kind, version, created_at').eq('user_id', uid),
        ]);
        const ids = (cs.data || []).map((c) => c.id);
        const { data: msgs } = ids.length ? await supabase.from('messages').select('consultation_id, sender, kind, content, created_at').in('consultation_id', ids) : { data: [] };
        return res.status(200).json({ exported_at: new Date().toISOString(), profile, bookings: bk.data, consultations: cs.data, messages: (msgs || []).map((m) => (m.kind === 'voice' ? { ...m, content: '[voice note]' } : m)), wallet_ledger: ledger.data, kundlis: kd.data, favorites: fav.data, support_tickets: tk.data, payments: pay.data, consents: cons.data });
      }
      throw httpError(400, 'Unknown section');
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};
      if (action === 'favorite') {
        const astrologerId = Number(req.body.astrologer_id);
        const { data: astro } = await supabase.from('astrologers').select('followers').eq('id', astrologerId).maybeSingle();
        if (!astro) throw httpError(404, 'Astrologer not found');
        const { data: existing } = await supabase.from('favorites').select('id').eq('user_id', uid).eq('astrologer_id', astrologerId).maybeSingle();
        if (existing) {
          await supabase.from('favorites').delete().eq('id', existing.id);
          await supabase.from('astrologers').update({ followers: Math.max(0, (astro.followers || 1) - 1) }).eq('id', astrologerId);
          return res.status(200).json({ favorited: false });
        }
        await supabase.from('favorites').insert({ user_id: uid, astrologer_id: astrologerId });
        await supabase.from('astrologers').update({ followers: (astro.followers || 0) + 1 }).eq('id', astrologerId);
        return res.status(200).json({ favorited: true });
      }
      if (action === 'ticket') {
        const { subject, message, category } = req.body;
        if (!subject || !message) throw httpError(400, 'Subject and message are required');
        const { data, error } = await supabase.from('support_tickets').insert({ user_id: uid, subject: String(subject).slice(0, 200), message: String(message).slice(0, 4000), category: category || 'General', status: 'open' }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
      if (action === 'read_notifications') {
        await supabase.from('notifications').update({ read: true }).eq('user_id', uid);
        return res.status(200).json({ ok: true });
      }
      if (action === 'avatar') {
        const url = await uploadPublicImage(`avatars/${uid}`, req.body);
        const { data } = await supabase.from('profiles').update({ avatar: url }).eq('user_id', uid).select().single();
        return res.status(200).json(data);
      }
      if (action === 'kundli_save') {
        const { name, gender, dob, tob, place, lat, lon, tz, chart } = req.body;
        if (!name || !dob || !tob || !place) throw httpError(400, 'Name, date, time and place are required');
        const { data, error } = await supabase.from('kundlis').insert({ user_id: uid, name, gender, dob, tob, place, lat, lon, tz, chart }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
      if (action === 'kundli_delete') {
        const { error } = await supabase.from('kundlis').delete().eq('id', req.body.id).eq('user_id', uid);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      if (action === 'delete_account') {
        if (req.body.confirm !== 'DELETE') throw httpError(400, 'Type DELETE to confirm');
        const { data: active } = await supabase.from('consultations').select('id').eq('user_id', uid).eq('status', 'active').limit(1);
        if (active?.length) throw httpError(409, 'Please end your active consultation first');
        const { data: upcoming } = await supabase.from('bookings').select('id').eq('user_id', uid).eq('status', 'upcoming').limit(1);
        if (upcoming?.length) throw httpError(409, 'Please cancel your upcoming bookings first');
        await Promise.all([
          supabase.from('kundlis').delete().eq('user_id', uid), supabase.from('favorites').delete().eq('user_id', uid),
          supabase.from('notifications').delete().eq('user_id', uid),
        ]);
        // Financial records (ledger, payments, bookings) are retained in anonymised form as required by tax law.
        await supabase.from('profiles').update({ full_name: 'Deleted user', email: null, phone: null, dob: null, tob: null, birth_place: null, avatar: null, gender: null, status: 'deleted' }).eq('user_id', uid);
        await supabase.from('reviews').update({ user_name: 'Former member' }).eq('user_id', uid);
        await supabase.auth.admin.deleteUser(uid);
        return res.status(200).json({ ok: true });
      }
      throw httpError(400, 'Unknown action');
    }

    if (req.method === 'PUT') {
      const fields = pick(req.body, ['full_name', 'phone', 'gender', 'dob', 'tob', 'birth_place', 'zodiac']);
      if (fields.full_name !== undefined && !String(fields.full_name).trim()) throw httpError(400, 'Name cannot be empty');
      const { data, error } = await supabase.from('profiles').update(fields).eq('user_id', uid).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    send(res, err);
  }
}
