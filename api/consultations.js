import { supabase, cors, send, httpError, requireRole, getBalance, rateFor, recomputeRating, settle, consultationState, sweepActive, signMessages, livekitConfigured, livekitToken, PRIVATE_PREFIX } from './_lib.js';

const REPLIES = {
  love: ['I am looking at your 7th house and Venus placement now. There is a meaningful shift coming in matters of the heart — patience over the next few weeks will serve you well.', 'Venus is favourably aspecting your Moon, which shows emotional warmth returning. Tell me, is this about an existing relationship or someone new?'],
  marriage: ['For marriage timing I study the 7th lord and the current Dasha. Your chart shows supportive periods ahead — the Jupiter transit is especially auspicious for commitment.'],
  career: ['Your 10th house is getting strength from Saturn’s transit. This is a phase of steady, well-earned growth — avoid impulsive job changes for the next two months.', 'I see Mercury supporting communication and negotiation. It is a good time to ask for recognition or explore a role that uses your expertise more fully.'],
  money: ['Your 2nd and 11th houses indicate gains through disciplined saving. Avoid speculative investments until the end of this Moon cycle.'],
  health: ['The 6th house suggests you need rest and routine. Please also consult a qualified doctor for any health concern — astrology is only a complement.'],
  generic: ['Thank you for sharing. Let me study your chart carefully — the planetary positions show a period of transformation guided by Jupiter.', 'I understand. Your Moon Nakshatra suggests deep intuition. Trust your inner voice; the answer you seek is closer than it seems.', 'Based on your current Dasha, the coming months favour new beginnings. A small remedy — offering water to the Sun at sunrise — will strengthen your confidence.'],
};
function craftReply(text, count) {
  const t = String(text || '').toLowerCase();
  if (count === 0 && !/\d/.test(t)) return 'To give you precise guidance, could you please share your date of birth, exact birth time and birth place? 🙏';
  const key = /marri|wedding|spouse/.test(t) ? 'marriage' : /love|relationship|partner|boyfriend|girlfriend|crush|breakup/.test(t) ? 'love' : /job|career|work|business|promotion|study|exam/.test(t) ? 'career' : /money|finance|wealth|loan|invest|debt/.test(t) ? 'money' : /health|ill|sick|stress|anxiety|sleep/.test(t) ? 'health' : 'generic';
  const pool = REPLIES[key];
  return pool[count % pool.length];
}
const MODE_LABEL = { chat: 'Chat', audio: 'Audio call', video: 'Video call' };
const CONTACT_RE = /(\+?\d[\d\s-]{8,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|(https?:\/\/\S+)|(\b[\w.-]+@(ok|ybl|upi|paytm|ibl|axl)\b)/i;

async function own(id, userId) {
  const { data: c } = await supabase.from('consultations').select('*').eq('id', id).maybeSingle();
  if (!c) throw httpError(404, 'Consultation not found');
  if (c.user_id !== userId) throw httpError(403, 'This consultation belongs to another account');
  return c;
}

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  try {
    const { user, profile } = await requireRole(req, ['customer']);

    if (req.method === 'GET') {
      const { id, after, mode } = req.query;
      if (id) {
        await own(Number(id), user.id);
        const { c, s } = await settle(Number(id));
        const { data: astro } = await supabase.from('astrologers').select('id,name,photo,slug,title,is_online,verified').eq('id', c.astrologer_id).single();
        let mq = supabase.from('messages').select('*').eq('consultation_id', c.id).order('id', { ascending: true });
        if (after) mq = mq.gt('id', Number(after));
        const { data: messages } = await mq;
        return res.status(200).json({ consultation: { ...c, astrologers: astro }, state: await consultationState(c, s, user.id), messages: await signMessages(messages || []), calls_enabled: livekitConfigured() });
      }
      await sweepActive({ user_id: user.id });
      let q = supabase.from('consultations').select('*, astrologers(id,name,photo,slug,title,is_online)').eq('user_id', user.id).order('created_at', { ascending: false });
      if (mode) q = q.in('mode', String(mode).split(','));
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { action } = req.body || {};

    if (action === 'start') {
      const { astrologer_id, mode, booking_id, consent } = req.body;
      if (!['chat', 'audio', 'video'].includes(mode)) throw httpError(400, 'Invalid mode');
      if (!consent) throw httpError(400, 'Please accept the consultation disclaimer to continue');
      const { data: astro } = await supabase.from('astrologers').select('*').eq('id', astrologer_id).maybeSingle();
      if (!astro || astro.status !== 'active') throw httpError(404, 'Astrologer not found');
      await sweepActive({ user_id: user.id });
      const { data: existing } = await supabase.from('consultations').select('*').eq('user_id', user.id).eq('status', 'active').limit(1);
      if (existing?.length) {
        const ex = existing[0];
        if (ex.astrologer_id === astro.id) return res.status(200).json(ex);
        throw httpError(409, 'You already have an active consultation. Please end it first.');
      }
      let booking = null, rate = rateFor(astro, mode), prepaid = false, maxSeconds = null, finalMode = mode;
      if (booking_id) {
        const { data: b } = await supabase.from('bookings').select('*').eq('id', booking_id).eq('user_id', user.id).maybeSingle();
        if (!b || b.status !== 'upcoming') throw httpError(400, 'This booking cannot be joined');
        if (Date.now() < new Date(b.scheduled_at).getTime() - 15 * 60000) throw httpError(400, 'You can join 15 minutes before the scheduled time');
        booking = b; prepaid = true; rate = Number(b.price_per_min); maxSeconds = b.duration * 60; finalMode = b.mode;
      } else {
        if (!astro.is_online) throw httpError(409, `${astro.name} is offline right now. You can book a session instead.`);
        const balance = await getBalance(user.id);
        if (balance < rate * 3) throw httpError(402, `A minimum balance of ₹${rate * 3} (3 minutes) is required. Please recharge your wallet.`);
      }
      if (finalMode !== 'chat' && !livekitConfigured()) throw httpError(503, 'Voice & video calling is being set up. Please use chat for now.');
      if (finalMode !== 'chat' && astro.settings && astro.settings[finalMode === 'audio' ? 'accept_audio' : 'accept_video'] === false) throw httpError(409, `${astro.name} is not accepting ${MODE_LABEL[finalMode].toLowerCase()}s right now`);

      const now = new Date().toISOString();
      const { data: c, error } = await supabase.from('consultations').insert({
        user_id: user.id, user_name: profile.full_name, astrologer_id: astro.id, booking_id: booking?.id || null, mode: finalMode,
        status: 'active', started_at: now, rate, prepaid, max_seconds: maxSeconds, auto_reply: finalMode === 'chat', amount: 0, minutes: 0,
      }).select().single();
      if (error) throw error;
      await supabase.from('consultation_sessions').insert({ consultation_id: c.id, provider: finalMode === 'chat' ? 'chat' : 'livekit', room: `av-consult-${c.id}`, last_heartbeat_at: now, last_active_at: finalMode === 'chat' ? now : null });
      const first = String(profile.full_name || '').split(' ')[0] || 'there';
      const rows = [{ consultation_id: c.id, sender: 'system', kind: 'text', content: `${MODE_LABEL[finalMode]} started with ${astro.name}` }];
      if (finalMode === 'chat') rows.push({ consultation_id: c.id, sender: 'astrologer', kind: 'text', content: `Namaste ${first} 🙏 I’m ${astro.name}. I’m here for you — share your birth details and tell me what’s on your mind.`, created_at: new Date(Date.now() + 2500).toISOString() });
      await supabase.from('messages').insert(rows);
      await supabase.from('notifications').insert({ astrologer_id: astro.id, audience: 'astrologer_direct', type: 'consultation', title: `Incoming ${MODE_LABEL[finalMode].toLowerCase()}`, body: `${profile.full_name} started a ${MODE_LABEL[finalMode].toLowerCase()} with you.` });
      await settle(c.id); // charges minute 1 immediately for chat
      return res.status(201).json(c);
    }

    const cid = Number(req.body.consultation_id);
    const c = await own(cid, user.id);

    if (action === 'heartbeat') {
      const r = await settle(c.id, { heartbeatFrom: 'customer' });
      return res.status(200).json({ state: await consultationState(r.c, r.s, user.id) });
    }

    if (action === 'call_token') {
      if (c.mode === 'chat') throw httpError(400, 'Not a call');
      if (c.status !== 'active') throw httpError(400, 'This consultation has ended');
      if (!livekitConfigured()) throw httpError(503, 'Calling is not configured');
      const room = `av-consult-${c.id}`;
      const token = livekitToken({ identity: `user-${user.id}`, name: profile.full_name, grants: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true }, ttl: 2 * 3600 });
      return res.status(200).json({ token, url: process.env.LIVEKIT_URL, room });
    }

    if (action === 'upload_voice') {
      if (c.status !== 'active') throw httpError(400, 'This consultation has ended');
      const { base64, contentType } = req.body;
      if (!base64) throw httpError(400, 'No audio received');
      if (!/^audio\//.test(String(contentType || 'audio/webm'))) throw httpError(400, 'Only audio files are allowed');
      const buf = Buffer.from(base64, 'base64');
      if (buf.length > 5 * 1024 * 1024) throw httpError(400, 'Voice note is too large');
      const ext = String(contentType).includes('mp4') ? 'm4a' : String(contentType).includes('ogg') ? 'ogg' : 'webm';
      const path = `${c.id}/${user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('voice-notes').upload(path, buf, { contentType: contentType || 'audio/webm' });
      if (error) throw error;
      return res.status(200).json({ path: PRIVATE_PREFIX + path });
    }

    if (action === 'message') {
      if (c.status !== 'active') throw httpError(400, 'This consultation has ended');
      const { kind = 'text', content, duration } = req.body;
      if (!content || !String(content).trim()) throw httpError(400, 'Message is empty');
      if (kind === 'voice' && !String(content).startsWith(`${PRIVATE_PREFIX}${c.id}/${user.id}-`)) throw httpError(400, 'Invalid voice note');
      if (kind === 'text' && CONTACT_RE.test(content)) throw httpError(400, 'For your safety, phone numbers, emails, UPI IDs and links cannot be shared in chat');
      const { data: msg, error } = await supabase.from('messages').insert({ consultation_id: c.id, sender: 'user', kind: kind === 'voice' ? 'voice' : 'text', content: String(content).slice(0, 4000), duration: duration || null }).select().single();
      if (error) throw error;
      if (c.auto_reply) {
        const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('consultation_id', c.id).eq('sender', 'user');
        const reply = kind === 'voice' ? 'Thank you for the voice note — I heard you clearly. Let me look at your chart for this…' : craftReply(content, (count || 1) - 1);
        await supabase.from('messages').insert({ consultation_id: c.id, sender: 'astrologer', kind: 'text', content: reply, created_at: new Date(Date.now() + 3000 + Math.min(4000, reply.length * 25)).toISOString() });
      }
      return res.status(201).json((await signMessages([msg]))[0]);
    }

    if (action === 'end') {
      const r = await settle(c.id, { end: true, reason: 'customer' });
      const st = await consultationState(r.c, r.s, user.id);
      return res.status(200).json({ state: st, summary: { minutes: r.c.minutes, seconds: r.c.duration_sec, rate: Number(r.c.rate), amount: Number(r.c.amount), balance: st.balance, prepaid: r.c.prepaid, reason: st.end_reason } });
    }

    if (action === 'rate') {
      if (c.status === 'active') throw httpError(400, 'Please end the consultation before rating');
      if (!c.minutes) throw httpError(400, 'Only connected consultations can be rated');
      const rating = Math.round(Number(req.body.rating));
      if (!(rating >= 1 && rating <= 5)) throw httpError(400, 'Please choose a rating');
      if (c.rating) throw httpError(400, 'You have already rated this consultation');
      const review = String(req.body.review || '').slice(0, 1000);
      const { data: claimed } = await supabase.from('consultations').update({ rating, review }).eq('id', c.id).is('rating', null).select('id').maybeSingle();
      if (!claimed) throw httpError(400, 'You have already rated this consultation');
      await supabase.from('reviews').insert({ astrologer_id: c.astrologer_id, user_id: user.id, user_name: profile.full_name, rating, comment: review || null, status: 'published', consultation_id: c.id });
      await recomputeRating(c.astrologer_id);
      return res.status(200).json({ ok: true });
    }
    throw httpError(400, 'Unknown action');
  } catch (err) {
    send(res, err);
  }
}
