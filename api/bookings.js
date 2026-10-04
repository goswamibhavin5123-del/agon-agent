import { supabase, cors, send, httpError, requireRole, walletApply, ref, evaluateCoupon, rateFor, round2 } from './_lib.js';

async function hasConflict(astrologerId, startIso, duration, excludeId) {
  const start = new Date(startIso).getTime();
  const end = start + duration * 60000;
  const { data } = await supabase.from('bookings').select('id, scheduled_at, duration').eq('astrologer_id', astrologerId).eq('status', 'upcoming')
    .gte('scheduled_at', new Date(start - 3 * 3600000).toISOString()).lt('scheduled_at', new Date(end).toISOString());
  return (data || []).some((b) => {
    if (excludeId && b.id === excludeId) return false;
    const bs = new Date(b.scheduled_at).getTime();
    return bs < end && start < bs + b.duration * 60000;
  });
}

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  try {
    // Public: busy slots only (no customer data).
    if (req.method === 'GET' && req.query.astrologer_id && req.query.from) {
      const { data, error } = await supabase.from('bookings').select('scheduled_at, duration').eq('astrologer_id', req.query.astrologer_id).eq('status', 'upcoming').gte('scheduled_at', req.query.from).lt('scheduled_at', req.query.to);
      if (error) throw error;
      return res.status(200).json(data);
    }

    const { user, profile } = await requireRole(req, ['customer']);

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('bookings').select('*, astrologers(id,name,photo,slug,title,chat_price,call_price,video_price,availability,is_online), services(name)').eq('user_id', user.id).order('scheduled_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { astrologer_id, service_id, mode, scheduled_at, duration, coupon_code, notes } = req.body || {};
      if (!['chat', 'audio', 'video'].includes(mode)) throw httpError(400, 'Choose a consultation mode');
      const dur = Number(duration);
      if (![15, 30, 45, 60].includes(dur)) throw httpError(400, 'Choose a valid duration');
      if (!scheduled_at || new Date(scheduled_at).getTime() < Date.now()) throw httpError(400, 'Choose a future date and time');
      const { data: astro } = await supabase.from('astrologers').select('*').eq('id', astrologer_id).maybeSingle();
      if (!astro || astro.status !== 'active') throw httpError(404, 'Astrologer unavailable');
      if (await hasConflict(astro.id, scheduled_at, dur)) throw httpError(409, 'That slot was just booked. Please pick another time.');

      const rate = rateFor(astro, mode);
      const subtotal = round2(rate * dur);
      let discount = 0, code = null;
      if (coupon_code) { const r = await evaluateCoupon(coupon_code, subtotal); discount = r.discount; code = r.coupon.code; }
      const total = round2(subtotal - discount);
      const reference = ref('BK');
      const label = mode === 'chat' ? 'Chat' : mode === 'audio' ? 'Audio call' : 'Video call';

      // Atomic debit first (fails with 402 if the wallet can’t cover it); compensate if the booking insert fails.
      await walletApply(user.id, -total, { type: 'debit', description: `${label} booking with ${astro.name}`, reference });
      const { data: booking, error } = await supabase.from('bookings').insert({
        user_id: user.id, user_name: profile.full_name, astrologer_id: astro.id, service_id: service_id || null, mode,
        scheduled_at, duration: dur, price_per_min: rate, subtotal, discount, total, coupon_code: code,
        payment_method: 'wallet', payment_status: 'paid', status: 'upcoming', refund_amount: 0, rescheduled_count: 0, notes: notes ? String(notes).slice(0, 500) : null, reference,
      }).select().single();
      if (error) {
        await walletApply(user.id, total, { type: 'refund', description: `Reversal · booking could not be created`, reference: `${reference}-REV` });
        throw error;
      }
      if (await hasConflict(astro.id, scheduled_at, dur, booking.id)) {
        // Lost a race with another booking for the same slot → undo atomically.
        const { data: undone } = await supabase.from('bookings').update({ status: 'refunded', refund_amount: total }).eq('id', booking.id).eq('status', 'upcoming').select('id').maybeSingle();
        if (undone) await walletApply(user.id, total, { type: 'refund', description: `Refund · slot taken by another booking`, reference: `${reference}-RACE` });
        throw httpError(409, 'That slot was just booked by someone else. You have been refunded.');
      }
      if (code) {
        const { data: c } = await supabase.from('coupons').select('uses').eq('code', code).single();
        await supabase.from('coupons').update({ uses: (c?.uses || 0) + 1 }).eq('code', code);
      }
      await supabase.from('notifications').insert([
        { user_id: user.id, audience: 'customer', type: 'booking', title: 'Booking confirmed', body: `${label} with ${astro.name} for ${dur} min is confirmed. Ref ${reference}.` },
        { astrologer_id: astro.id, audience: 'astrologer_direct', type: 'booking', title: 'New booking', body: `${profile.full_name} booked a ${dur}-min ${label.toLowerCase()} (${new Date(scheduled_at).toUTCString().slice(0, 22)} UTC).` },
      ]);
      return res.status(201).json(booking);
    }

    if (req.method === 'PUT') {
      const { id, action } = req.body || {};
      const { data: b } = await supabase.from('bookings').select('*, astrologers(name)').eq('id', id).maybeSingle();
      if (!b) throw httpError(404, 'Booking not found');
      if (b.user_id !== user.id) throw httpError(403, 'This booking belongs to another account');

      if (action === 'reschedule') {
        if (b.status !== 'upcoming') throw httpError(400, 'Only upcoming bookings can be rescheduled');
        const { scheduled_at } = req.body;
        if (!scheduled_at || new Date(scheduled_at).getTime() < Date.now()) throw httpError(400, 'Choose a future time');
        if (await hasConflict(b.astrologer_id, scheduled_at, b.duration, b.id)) throw httpError(409, 'That slot is taken. Try another.');
        const { data, error } = await supabase.from('bookings').update({ scheduled_at, rescheduled_count: (b.rescheduled_count || 0) + 1 }).eq('id', id).eq('status', 'upcoming').select().single();
        if (error) throw error;
        await supabase.from('notifications').insert({ user_id: user.id, audience: 'customer', type: 'booking', title: 'Booking rescheduled', body: `Your session with ${b.astrologers?.name} has been moved.` });
        return res.status(200).json(data);
      }
      if (action === 'cancel') {
        const hours = (new Date(b.scheduled_at).getTime() - Date.now()) / 3600000;
        const pct = hours >= 2 ? 100 : hours > 0 ? 50 : 0;
        const refund = round2((Number(b.total) * pct) / 100);
        // CAS on status: only one cancel can ever win → refund can never be paid twice.
        const { data, error } = await supabase.from('bookings').update({ status: 'cancelled', refund_amount: refund }).eq('id', id).eq('status', 'upcoming').select().maybeSingle();
        if (error) throw error;
        if (!data) throw httpError(400, 'This booking can no longer be cancelled');
        if (refund > 0) await walletApply(user.id, refund, { type: 'refund', description: `Refund (${pct}%) · booking with ${b.astrologers?.name}`, reference: `${b.reference}-RF` });
        await supabase.from('notifications').insert({ user_id: user.id, audience: 'customer', type: 'booking', title: 'Booking cancelled', body: refund ? `₹${refund} has been refunded to your wallet.` : 'No refund was applicable for this cancellation.' });
        return res.status(200).json({ ...data, refund_pct: pct });
      }
      throw httpError(400, 'Unknown action');
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    send(res, err);
  }
}
