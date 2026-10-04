import crypto from 'crypto';
import supabase from './db-client.js';

export { supabase };

/* ------------------------------------------------------------------ http */
export function cors(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  return true;
}
export function httpError(status, message) { return Object.assign(new Error(message), { status }); }
export function send(res, err) {
  if (!err.status || err.status >= 500) console.error('API error:', err);
  res.status(err.status || 500).json({ error: err.status && err.status < 500 ? err.message : err.message || 'Something went wrong' });
}
export function pick(obj, keys) { const out = {}; for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k]; return out; }
export function ref(prefix = 'TXN') { return prefix + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase(); }
export const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function clientIp(req) { return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null; }

/* ------------------------------------------------------------ auth & RBAC */
export const ROLES = ['customer', 'astrologer', 'admin'];

export async function getUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
}

export async function ensureProfile(user) {
  const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (data) return data;
  const meta = user.user_metadata || {};
  const name = meta.full_name || meta.name || (user.email || 'Seeker').split('@')[0];
  // Self sign-ups are ALWAYS customers. Roles are only elevated by an admin.
  const { data: created, error } = await supabase.from('profiles').insert({
    user_id: user.id, email: user.email, full_name: name, avatar: meta.avatar_url || null, wallet_balance: 0, role: 'customer', status: 'active',
  }).select().single();
  if (error) {
    const { data: again } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (again) return again;
    throw error;
  }
  await walletApply(user.id, 250, { type: 'credit', description: 'Welcome gift from Astro Venus', reference: `WEL-${user.id}` });
  await supabase.from('notifications').insert({ user_id: user.id, audience: 'customer', type: 'wallet', title: 'Welcome to Astro Venus', body: '₹250 has been added to your wallet. Your first consultation awaits under the stars.' });
  return { ...created, wallet_balance: 250 };
}

/**
 * Authenticate and authorise. 401 when not signed in, 403 when signed in with the wrong role
 * or a suspended account. Returns { user, profile, astrologer? }.
 */
export async function requireRole(req, roles) {
  const user = await getUser(req);
  if (!user) throw httpError(401, 'Please sign in to continue');
  const profile = await ensureProfile(user);
  if (profile.status === 'suspended') throw httpError(403, 'Your account is suspended. Contact support.');
  const role = ROLES.includes(profile.role) ? profile.role : 'customer';
  if (roles && !roles.includes(role)) throw httpError(403, 'You do not have permission to access this resource');
  const ctx = { user, profile: { ...profile, role } };
  if (role === 'astrologer') {
    const { data: astro } = await supabase.from('astrologers').select('*').eq('user_id', user.id).maybeSingle();
    if (!astro && roles?.length === 1 && roles[0] === 'astrologer') throw httpError(403, 'No astrologer profile is linked to this account');
    ctx.astrologer = astro || null;
  }
  return ctx;
}

/* --------------------------------------------------- atomic wallet ledger
 * Every wallet change is ONE insert into wallet_ledger whose primary key is
 * `${user_id}:${seq}`. Two concurrent writers computing the same next seq
 * collide on the primary key; the loser re-reads and retries. The balance and
 * the ledger entry are therefore written in a single atomic statement and the
 * balance can never go below zero or be double-spent.
 */
const pad = (n) => String(n).padStart(8, '0');

export async function walletState(userId) {
  const { data, error } = await supabase.from('wallet_ledger').select('seq, balance_after').eq('user_id', userId).order('seq', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] ? { seq: data[0].seq, balance: Number(data[0].balance_after) } : { seq: 0, balance: 0 };
}
export async function getBalance(userId) { return (await walletState(userId)).balance; }

export async function walletApply(userId, delta, { type, description, reference, allowNegative = false }) {
  delta = round2(delta);
  for (let attempt = 0; attempt < 8; attempt++) {
    const st = await walletState(userId);
    const next = round2(st.balance + delta);
    if (next < 0 && !allowNegative) throw httpError(402, 'Insufficient wallet balance');
    const seq = st.seq + 1;
    const { error } = await supabase.from('wallet_ledger').insert({
      id: `${userId}:${pad(seq)}`, user_id: userId, seq, delta, balance_after: next,
      type: type || (delta >= 0 ? 'credit' : 'debit'), description, reference: reference || ref(),
    });
    if (!error) {
      supabase.from('profiles').update({ wallet_balance: next }).eq('user_id', userId).then(() => {}, () => {});
      return next;
    }
    if (error.code !== '23505') throw error;
    await sleep(20 + Math.random() * 60);
  }
  throw httpError(409, 'Wallet is busy, please retry');
}

export function ledgerToTx(r) {
  return { id: r.id, user_id: r.user_id, type: r.type, amount: Math.abs(Number(r.delta)), delta: Number(r.delta), balance_after: Number(r.balance_after), description: r.description, reference: r.reference, status: 'success', created_at: r.created_at };
}

/* ---------------------------------------------------------------- misc */
export async function getCommission() {
  const { data } = await supabase.from('settings').select('value').eq('key', 'commission').maybeSingle();
  return Number(data?.value?.rate ?? 30);
}

export async function evaluateCoupon(codeRaw, amount) {
  const code = String(codeRaw || '').trim().toUpperCase();
  if (!code) throw httpError(400, 'Enter a coupon code');
  const { data: c } = await supabase.from('coupons').select('*').eq('code', code).maybeSingle();
  if (!c || !c.active) throw httpError(404, 'This coupon is invalid or inactive');
  if (c.expires_at && new Date(c.expires_at) < new Date()) throw httpError(400, 'This coupon has expired');
  if (Number(amount) < Number(c.min_amount || 0)) throw httpError(400, `Minimum order of ₹${c.min_amount} required`);
  let discount = c.discount_type === 'percent' ? (Number(amount) * Number(c.value)) / 100 : Number(c.value);
  if (c.max_discount) discount = Math.min(discount, Number(c.max_discount));
  discount = round2(Math.min(discount, Number(amount)));
  return { coupon: { code: c.code, description: c.description, discount_type: c.discount_type, value: c.value }, discount };
}

export function rateFor(astro, mode) {
  if (mode === 'chat') return Number(astro.chat_price);
  if (mode === 'audio') return Number(astro.call_price);
  return Number(astro.video_price);
}

export async function recomputeRating(astrologerId) {
  const { data } = await supabase.from('reviews').select('rating').eq('astrologer_id', astrologerId).eq('status', 'published');
  const list = data || [];
  if (!list.length) return;
  const avg = list.reduce((s, r) => s + Number(r.rating), 0) / list.length;
  await supabase.from('astrologers').update({ rating: Math.round(avg * 10) / 10, reviews_count: list.length }).eq('id', astrologerId);
}

export function dayKey(d) { return new Date(d).toISOString().slice(0, 10); }
export function lastNDays(n) {
  const out = []; const now = new Date();
  for (let i = n - 1; i >= 0; i--) { const d = new Date(now); d.setUTCDate(now.getUTCDate() - i); out.push(d.toISOString().slice(0, 10)); }
  return out;
}

/** Strip private fields before an astrologer record is sent to the public. */
export function publicAstro(a) {
  if (!a) return a;
  const { kyc_docs, user_id, settings, ...rest } = a;
  return rest;
}

/* ------------------------------------------------------ private storage */
export const PRIVATE_PREFIX = 'private:';
export async function signMessages(messages) {
  const voice = (messages || []).filter((m) => m.kind === 'voice' && String(m.content).startsWith(PRIVATE_PREFIX));
  if (!voice.length) return messages;
  const paths = voice.map((m) => String(m.content).slice(PRIVATE_PREFIX.length));
  const { data } = await supabase.storage.from('voice-notes').createSignedUrls(paths, 7200);
  const map = new Map((data || []).map((d) => [d.path, d.signedUrl]));
  return messages.map((m) => (m.kind === 'voice' && String(m.content).startsWith(PRIVATE_PREFIX) ? { ...m, content: map.get(String(m.content).slice(PRIVATE_PREFIX.length)) || '' } : m));
}

export async function uploadPublicImage(folder, { base64, contentType, name }) {
  if (!base64) throw httpError(400, 'No file received');
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(String(contentType))) throw httpError(400, 'Only PNG, JPG, WEBP or GIF images are allowed');
  const buf = Buffer.from(base64, 'base64');
  if (buf.length > 3 * 1024 * 1024) throw httpError(400, 'Image must be under 3 MB');
  const ext = String(contentType).split('/')[1].replace('jpeg', 'jpg');
  const path = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const { error } = await supabase.storage.from('public-assets').upload(path, buf, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from('public-assets').getPublicUrl(path).data.publicUrl;
}

/* ------------------------------------------------------------- LiveKit */
export const livekitConfigured = () => !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_URL);

export function livekitToken({ identity, name, grants, ttl = 3600 }) {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = enc({ alg: 'HS256', typ: 'JWT' });
  const body = enc({ iss: process.env.LIVEKIT_API_KEY, sub: identity, name, nbf: now - 10, exp: now + ttl, jti: `${identity}-${now}`, video: grants });
  const sig = crypto.createHmac('sha256', process.env.LIVEKIT_API_SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

/** Server-side presence check: which identities are really in the room right now. */
export async function livekitParticipants(room) {
  const host = String(process.env.LIVEKIT_URL).replace(/^wss?:\/\//, 'https://').replace(/\/$/, '');
  const token = livekitToken({ identity: 'astro-venus-billing', grants: { room, roomAdmin: true, roomList: true }, ttl: 60 });
  try {
    const r = await fetch(`${host}/twirp/livekit.RoomService/ListParticipants`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ room }) });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.participants || []).map((p) => p.identity);
  } catch { return []; }
}

export async function livekitCloseRoom(room) {
  if (!livekitConfigured()) return;
  const host = String(process.env.LIVEKIT_URL).replace(/^wss?:\/\//, 'https://').replace(/\/$/, '');
  const token = livekitToken({ identity: 'astro-venus-billing', grants: { room, roomAdmin: true, roomCreate: true }, ttl: 60 });
  try { await fetch(`${host}/twirp/livekit.RoomService/DeleteRoom`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ room }) }); } catch { /* best effort */ }
}

/* ---------------------------------------- server-authoritative billing */
const GRACE_MS = 30000;      // billable time extends this far past the last confirmed activity
const STALE_MS = 75000;      // no confirmed activity for this long → session ends
const RING_MS = 90000;       // call must connect within this window or it ends free of charge
const MODE_LABEL = { chat: 'Chat', audio: 'Audio call', video: 'Video call' };

export async function getSession(consultationId) {
  const { data } = await supabase.from('consultation_sessions').select('*').eq('consultation_id', consultationId).maybeSingle();
  return data;
}

async function finalize(c, s, endAtMs, reason) {
  const connected = s?.connected_at ? new Date(s.connected_at).getTime() : null;
  const sec = connected ? Math.max(0, Math.round((endAtMs - connected) / 1000)) : 0;
  const { data: upd } = await supabase.from('consultations').update({ status: 'ended', ended_at: new Date(endAtMs).toISOString(), duration_sec: c.max_seconds ? Math.min(sec, c.max_seconds) : sec })
    .eq('id', c.id).eq('status', 'active').select('*').maybeSingle();
  if (!upd) return null; // someone else already ended it
  await supabase.from('consultation_sessions').update({ end_reason: reason }).eq('consultation_id', c.id);
  await supabase.from('messages').delete().eq('consultation_id', c.id).gt('created_at', new Date().toISOString());
  const why = { customer: '', astrologer: ' by astrologer', balance: ' · wallet balance exhausted', disconnected: ' · connection lost', no_answer: ' · astrologer did not connect (no charge)', time_up: ' · booked time complete', admin: ' by admin' }[reason] || '';
  await supabase.from('messages').insert({ consultation_id: c.id, sender: 'system', kind: 'text', content: `Consultation ended${why} · ${upd.minutes} min billed` });
  const { data: astro } = await supabase.from('astrologers').select('orders_count').eq('id', c.astrologer_id).single();
  if (connected) await supabase.from('astrologers').update({ orders_count: (astro?.orders_count || 0) + 1 }).eq('id', c.astrologer_id);
  if (c.booking_id && connected) await supabase.from('bookings').update({ status: 'completed' }).eq('id', c.booking_id);
  if (s?.room) livekitCloseRoom(s.room);
  return upd;
}

/**
 * Bring a consultation's billing up to date using only server clocks and server-verified presence.
 * Charges are made per started minute, in advance, via the atomic ledger. A compare-and-swap on
 * consultations.minutes guarantees each minute is charged exactly once even under concurrent calls.
 */
export async function settle(consultationId, { heartbeatFrom, end, reason } = {}) {
  let { data: c } = await supabase.from('consultations').select('*').eq('id', consultationId).single();
  if (!c) throw httpError(404, 'Consultation not found');
  let s = await getSession(c.id);
  if (c.status !== 'active') return { c, s };
  const now = Date.now();
  const patch = {};

  if (heartbeatFrom === 'customer') patch.last_heartbeat_at = new Date(now).toISOString();

  // Presence
  if (c.mode === 'chat') {
    if (heartbeatFrom === 'customer') patch.last_active_at = new Date(now).toISOString();
    if (!s.connected_at) patch.connected_at = c.started_at;
  } else if (livekitConfigured()) {
    const ids = await livekitParticipants(s.room);
    const both = ids.includes(`user-${c.user_id}`) && ids.includes(`astro-${c.astrologer_id}`);
    if (both) { patch.last_active_at = new Date(now).toISOString(); if (!s.connected_at) patch.connected_at = new Date(now).toISOString(); }
  }
  if (Object.keys(patch).length) {
    await supabase.from('consultation_sessions').update(patch).eq('consultation_id', c.id);
    s = { ...s, ...patch };
  }

  const connectedMs = s.connected_at ? new Date(s.connected_at).getTime() : null;
  const lastActive = s.last_active_at ? new Date(s.last_active_at).getTime() : connectedMs;

  // Never connected → end free of charge after the ringing window.
  if (!connectedMs) {
    if (end || now - new Date(c.started_at).getTime() > RING_MS) { const upd = await finalize(c, s, now, end ? reason || 'customer' : 'no_answer'); return { c: upd || c, s: await getSession(c.id) }; }
    return { c, s };
  }

  let billableEnd = Math.min(now, (lastActive || connectedMs) + GRACE_MS);
  if (c.max_seconds) billableEnd = Math.min(billableEnd, connectedMs + c.max_seconds * 1000);
  const elapsed = Math.max(0, billableEnd - connectedMs) / 1000;
  const stale = now - (lastActive || connectedMs) > STALE_MS;
  const timeUp = c.max_seconds && now >= connectedMs + c.max_seconds * 1000;
  const finishing = end || stale || timeUp;
  let due = finishing ? Math.max(1, Math.ceil(elapsed / 60)) : Math.floor(elapsed / 60) + 1;
  let endReason = end ? reason || 'customer' : stale ? 'disconnected' : timeUp ? 'time_up' : null;

  if (due > c.minutes) {
    const rate = Number(c.rate);
    const { data: claimed } = await supabase.from('consultations').update({ minutes: due, amount: c.prepaid ? 0 : round2(due * rate) })
      .eq('id', c.id).eq('minutes', c.minutes).eq('status', 'active').select('*').maybeSingle();
    if (claimed) {
      if (!c.prepaid) {
        try {
          const { data: astro } = await supabase.from('astrologers').select('name').eq('id', c.astrologer_id).single();
          await walletApply(c.user_id, -round2((due - c.minutes) * rate), { type: 'debit', description: `${MODE_LABEL[c.mode]} with ${astro?.name || 'astrologer'} · min ${c.minutes + 1}${due - c.minutes > 1 ? `–${due}` : ''}`, reference: `CN${c.id}-M${due}` });
          c = claimed;
        } catch (e) {
          // Could not pay for the next minute → roll the claim back and end at the paid boundary.
          await supabase.from('consultations').update({ minutes: c.minutes, amount: round2(c.minutes * rate) }).eq('id', c.id).eq('minutes', due);
          if (e.status !== 402) throw e;
          endReason = 'balance';
          billableEnd = Math.min(billableEnd, connectedMs + c.minutes * 60000);
        }
      } else c = claimed;
    } else {
      ({ data: c } = await supabase.from('consultations').select('*').eq('id', consultationId).single());
    }
  }

  if (endReason) {
    const upd = await finalize(c, s, Math.max(billableEnd, connectedMs), endReason);
    return { c: upd || (await supabase.from('consultations').select('*').eq('id', c.id).single()).data, s: await getSession(c.id) };
  }
  return { c, s };
}

export async function consultationState(c, s, userId) {
  const balance = userId ? await getBalance(userId) : null;
  const connectedMs = s?.connected_at ? new Date(s.connected_at).getTime() : null;
  return {
    id: c.id, status: c.status, mode: c.mode, rate: Number(c.rate), minutes: c.minutes, amount: Number(c.amount), prepaid: c.prepaid, max_seconds: c.max_seconds,
    started_at: c.started_at, ended_at: c.ended_at, duration_sec: c.duration_sec, connected_at: s?.connected_at || null,
    paid_until: connectedMs ? new Date(connectedMs + c.minutes * 60000).toISOString() : null,
    end_reason: s?.end_reason || null, balance, server_now: new Date().toISOString(), provider: s?.provider || null,
  };
}

/** End any of a user's (or astrologer's) sessions whose activity has gone stale. */
export async function sweepActive(filter) {
  let q = supabase.from('consultations').select('id').eq('status', 'active');
  if (filter.user_id) q = q.eq('user_id', filter.user_id);
  if (filter.astrologer_id) q = q.eq('astrologer_id', filter.astrologer_id);
  const { data } = await q.limit(20);
  for (const row of data || []) { try { await settle(row.id); } catch (e) { console.error('sweep', e); } }
}
