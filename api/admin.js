import { supabase, cors, send, httpError, requireRole, walletApply, ref, getCommission, lastNDays, dayKey, round2, ledgerToTx, settle, uploadPublicImage } from './_lib.js';
import { verifyRazorpay, verifyStripe } from './payments.js';

async function latestBalances() {
  const { data } = await supabase.from('wallet_ledger').select('user_id, seq, balance_after').order('seq', { ascending: false }).limit(10000);
  const m = new Map();
  for (const r of data || []) if (!m.has(r.user_id)) m.set(r.user_id, Number(r.balance_after));
  return m;
}

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  try {
    const { user: me } = await requireRole(req, ['admin']);

    if (req.method === 'GET') {
      const section = req.query.section || 'stats';

      if (section === 'stats') {
        const [p, a, b, c, t, w, r, bal] = await Promise.all([
          supabase.from('profiles').select('user_id, created_at, role'),
          supabase.from('astrologers').select('id, name, photo, is_online, kyc_status, orders_count, rating, followers, status'),
          supabase.from('bookings').select('id, total, status, mode, created_at'),
          supabase.from('consultations').select('id, amount, mode, status, created_at'),
          supabase.from('wallet_ledger').select('*').order('created_at', { ascending: false }).limit(5000),
          supabase.from('withdrawals').select('id, amount, status'),
          supabase.from('reviews').select('rating'),
          latestBalances(),
        ]);
        const profiles = (p.data || []).filter((x) => x.role === 'customer'), astros = a.data || [], bookings = b.data || [], cons = c.data || [], tx = (t.data || []).map(ledgerToTx), wd = w.data || [], reviews = r.data || [];
        const commission = await getCommission();
        const gross = round2(cons.reduce((s, x) => s + Number(x.amount || 0), 0) + bookings.filter((x) => x.status !== 'cancelled' && x.status !== 'refunded').reduce((s, x) => s + Number(x.total || 0), 0));
        const days = lastNDays(14);
        return res.status(200).json({
          users: profiles.length, wallet_float: round2([...bal.values()].reduce((s, v) => s + v, 0)),
          astrologers: astros.length, online: astros.filter((x) => x.is_online).length, kyc_pending: astros.filter((x) => x.kyc_status === 'pending').length,
          bookings: bookings.length, upcoming: bookings.filter((x) => x.status === 'upcoming').length,
          consultations: cons.length, live: cons.filter((x) => x.status === 'active').length,
          gross, commission, platform_earnings: round2((gross * commission) / 100),
          refunds: round2(tx.filter((x) => x.type === 'refund').reduce((s, x) => s + x.amount, 0)),
          withdrawals_pending: wd.filter((x) => x.status === 'pending').length, withdrawals_pending_amount: round2(wd.filter((x) => x.status === 'pending').reduce((s, x) => s + Number(x.amount), 0)),
          avg_rating: reviews.length ? Math.round((reviews.reduce((s, x) => s + Number(x.rating), 0) / reviews.length) * 10) / 10 : 0, reviews: reviews.length,
          revenue_series: days.map((d) => ({ label: d.slice(5), value: round2(tx.filter((x) => x.type === 'debit' && dayKey(x.created_at) === d).reduce((s, x) => s + x.amount, 0)) })),
          activity_series: days.map((d) => ({ label: d.slice(5), value: cons.filter((x) => dayKey(x.created_at) === d).length + bookings.filter((x) => dayKey(x.created_at) === d).length })),
          user_series: days.map((d) => ({ label: d.slice(5), value: profiles.filter((x) => dayKey(x.created_at) <= d).length })),
          by_mode: ['chat', 'audio', 'video'].map((m) => ({ label: m, value: cons.filter((x) => x.mode === m).length + bookings.filter((x) => x.mode === m).length })),
          rating_dist: [5, 4, 3, 2, 1].map((s) => ({ label: `${s}★`, value: reviews.filter((x) => Number(x.rating) === s).length })),
          top_astrologers: [...astros].sort((x, y) => y.orders_count - x.orders_count).slice(0, 6),
          recent_transactions: tx.slice(0, 8),
        });
      }
      if (section === 'users') {
        const [{ data, error }, bal] = await Promise.all([supabase.from('profiles').select('*').order('created_at', { ascending: false }), latestBalances()]);
        if (error) throw error;
        return res.status(200).json((data || []).map((u) => ({ ...u, wallet_balance: bal.get(u.user_id) ?? 0 })));
      }
      if (section === 'bookings') {
        const { data, error } = await supabase.from('bookings').select('*, astrologers(id,name,photo)').order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (section === 'consultations') {
        let q = supabase.from('consultations').select('*, astrologers(id,name,photo)').order('created_at', { ascending: false });
        if (req.query.mode) q = q.in('mode', String(req.query.mode).split(','));
        const { data, error } = await q;
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (section === 'messages') {
        const { data, error } = await supabase.from('messages').select('*').eq('consultation_id', req.query.consultation_id).lte('created_at', new Date().toISOString()).order('id');
        if (error) throw error;
        // Admins see that a voice note exists but cannot play private audio.
        return res.status(200).json((data || []).map((m) => (m.kind === 'voice' ? { ...m, kind: 'text', content: '🎙 Voice note (private)' } : m)));
      }
      if (section === 'transactions') {
        let q = supabase.from('wallet_ledger').select('*').order('created_at', { ascending: false }).limit(1000);
        if (req.query.type) q = q.in('type', String(req.query.type).split(','));
        const { data, error } = await q;
        if (error) throw error;
        return res.status(200).json((data || []).map(ledgerToTx));
      }
      if (section === 'payments') {
        const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(1000);
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (section === 'withdrawals') {
        const { data, error } = await supabase.from('withdrawals').select('*, astrologers(id,name,photo)').order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (section === 'tickets') {
        const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (section === 'kyc_doc') {
        const { data: a } = await supabase.from('astrologers').select('kyc_docs').eq('id', req.query.astrologer_id).single();
        const path = a?.kyc_docs?.id_path;
        if (!path) throw httpError(404, 'No document uploaded');
        const { data, error } = await supabase.storage.from('kyc-docs').createSignedUrl(path, 300);
        if (error) throw error;
        return res.status(200).json({ url: data.signedUrl, expires_in: 300 });
      }
      if (section === 'commission') {
        const rate = await getCommission();
        const [a, c, b] = await Promise.all([supabase.from('astrologers').select('id, name, photo, orders_count'), supabase.from('consultations').select('astrologer_id, amount'), supabase.from('bookings').select('astrologer_id, total, status')]);
        const rows = (a.data || []).map((x) => {
          const gross = round2((c.data || []).filter((y) => y.astrologer_id === x.id).reduce((s, y) => s + Number(y.amount || 0), 0) + (b.data || []).filter((y) => y.astrologer_id === x.id && y.status !== 'cancelled' && y.status !== 'refunded').reduce((s, y) => s + Number(y.total || 0), 0));
          return { ...x, gross, platform: round2((gross * rate) / 100), payout: round2((gross * (100 - rate)) / 100) };
        }).sort((x, y) => y.gross - x.gross);
        return res.status(200).json({ rate, rows });
      }
      throw httpError(400, 'Unknown section');
    }

    if (req.method === 'POST' && req.body?.action === 'upload_image') {
      const folder = ['services', 'banners', 'blogs', 'astrologers'].includes(req.body.folder) ? req.body.folder : 'banners';
      return res.status(200).json({ url: await uploadPublicImage(folder, req.body) });
    }

    if (req.method === 'PUT') {
      const { section } = req.body || {};
      if (section === 'users') {
        const { user_id, status, role, wallet_delta, note } = req.body;
        const { data: target } = await supabase.from('profiles').select('role').eq('user_id', user_id).maybeSingle();
        if (!target) throw httpError(404, 'User not found');
        if (user_id === me.id && (status || role)) throw httpError(400, 'You cannot change your own role or status');
        const patch = {};
        if (status) { if (!['active', 'suspended'].includes(status)) throw httpError(400, 'Invalid status'); patch.status = status; }
        if (role) {
          if (!['customer', 'admin'].includes(role)) throw httpError(400, 'Astrologer role is granted by linking an astrologer profile');
          if (target.role === 'astrologer') throw httpError(400, 'Unlink the astrologer profile first');
          patch.role = role;
        }
        if (Object.keys(patch).length) await supabase.from('profiles').update(patch).eq('user_id', user_id);
        if (wallet_delta && Number(wallet_delta) !== 0) {
          if (target.role !== 'customer') throw httpError(400, 'Wallets exist only for customers');
          if (Math.abs(Number(wallet_delta)) > 10000) throw httpError(400, 'Manual adjustments are limited to ₹10,000');
          if (!note || String(note).trim().length < 4) throw httpError(400, 'A reason is required for manual adjustments');
          const d = Number(wallet_delta);
          await walletApply(user_id, d, { type: d > 0 ? 'credit' : 'debit', description: `Admin adjustment · ${String(note).slice(0, 120)}`, reference: ref('ADM') });
        }
        const { data } = await supabase.from('profiles').select('*').eq('user_id', user_id).single();
        return res.status(200).json(data);
      }
      if (section === 'withdrawals') {
        const { id, status } = req.body;
        const allowed = { pending: ['approved', 'rejected'], approved: ['paid', 'rejected'] };
        const { data: w } = await supabase.from('withdrawals').select('status').eq('id', id).single();
        if (!allowed[w?.status]?.includes(status)) throw httpError(400, `Cannot move a ${w?.status} withdrawal to ${status}`);
        const { data, error } = await supabase.from('withdrawals').update({ status, processed_at: new Date().toISOString() }).eq('id', id).eq('status', w.status).select().single();
        if (error) throw error;
        await supabase.from('notifications').insert({ astrologer_id: data.astrologer_id, audience: 'astrologer_direct', type: 'wallet', title: `Withdrawal ${status}`, body: `Your withdrawal request of ₹${data.amount} is ${status}.` });
        return res.status(200).json(data);
      }
      if (section === 'bookings') {
        const { id, status } = req.body;
        if (!['completed', 'refunded'].includes(status)) throw httpError(400, 'Invalid status');
        const { data: b } = await supabase.from('bookings').select('*').eq('id', id).single();
        if (!b) throw httpError(404, 'Booking not found');
        if (status === 'completed') {
          const { data } = await supabase.from('bookings').update({ status }).eq('id', id).eq('status', 'upcoming').select().maybeSingle();
          if (!data) throw httpError(400, 'Only upcoming bookings can be completed');
          return res.status(200).json(data);
        }
        const refund = round2(Number(b.total) - Number(b.refund_amount || 0));
        const { data } = await supabase.from('bookings').update({ status: 'refunded', refund_amount: Number(b.total) }).eq('id', id).neq('status', 'refunded').eq('refund_amount', b.refund_amount).select().maybeSingle();
        if (!data) throw httpError(409, 'Booking was already refunded');
        if (refund > 0) await walletApply(b.user_id, refund, { type: 'refund', description: `Admin refund · booking ${b.reference}`, reference: `${b.reference}-ADMRF` });
        return res.status(200).json(data);
      }
      if (section === 'consultations') {
        const r = await settle(Number(req.body.id), { end: true, reason: 'admin' });
        return res.status(200).json(r.c);
      }
      if (section === 'payments') {
        const { data: p } = await supabase.from('payments').select('*').eq('id', req.body.id).single();
        if (!p || p.status === 'paid') return res.status(200).json(p);
        const r = p.provider === 'razorpay' ? await verifyRazorpay(p) : p.provider === 'stripe' ? await verifyStripe(p) : { payment: p };
        return res.status(200).json(r.payment);
      }
      if (section === 'commission') {
        const rate = Number(req.body.rate);
        if (!(rate >= 0 && rate <= 90)) throw httpError(400, 'Commission must be between 0 and 90%');
        await supabase.from('settings').upsert({ key: 'commission', value: { rate } });
        return res.status(200).json({ rate });
      }
      if (section === 'kyc') {
        const { astrologer_id, status, note } = req.body;
        if (!['approved', 'rejected'].includes(status)) throw httpError(400, 'Invalid status');
        const patch = { kyc_status: status, verified: status === 'approved' };
        const { data, error } = await supabase.from('astrologers').update(patch).eq('id', astrologer_id).select('id, name, kyc_status, verified').single();
        if (error) throw error;
        await supabase.from('notifications').insert({ astrologer_id, audience: 'astrologer_direct', type: 'kyc', title: `KYC ${status}`, body: note || (status === 'approved' ? 'Your identity is verified. The verified badge is now live on your profile.' : 'Please review your documents and resubmit.') });
        return res.status(200).json(data);
      }
      if (section === 'tickets') {
        const { data, error } = await supabase.from('support_tickets').update({ status: req.body.status === 'resolved' ? 'resolved' : 'open' }).eq('id', req.body.id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      throw httpError(400, 'Unknown section');
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    send(res, err);
  }
}
