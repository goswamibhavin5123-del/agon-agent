import crypto from 'crypto';
import { supabase, cors, send, httpError, requireRole, walletApply } from './_lib.js';

/*
 * Provider-independent payments. The browser never decides whether a payment succeeded:
 * every credit is confirmed server-to-server with the provider's API before the wallet is touched,
 * and a compare-and-swap on payments.status (created → paid) guarantees each payment credits once,
 * even if the client callback, the webhook and a manual reconcile all arrive together.
 */
const RZP = 'https://api.razorpay.com/v1';
const STRIPE = 'https://api.stripe.com/v1';
const rzpOn = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const stripeOn = () => !!process.env.STRIPE_SECRET_KEY;
const bonusPct = (v) => (v >= 2000 ? 15 : v >= 1000 ? 10 : v >= 500 ? 5 : 0);

async function rzp(path, opts = {}) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const r = await fetch(`${RZP}${path}`, { ...opts, headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw httpError(502, j?.error?.description || 'Razorpay request failed');
  return j;
}
async function stripe(path, form) {
  const r = await fetch(`${STRIPE}${path}`, { method: form ? 'POST' : 'GET', headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form ? new URLSearchParams(form).toString() : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw httpError(502, j?.error?.message || 'Stripe request failed');
  return j;
}
const safeEq = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

async function credit(p, providerPaymentId) {
  const { data: claimed } = await supabase.from('payments').update({ status: 'paid', provider_payment_id: providerPaymentId, paid_at: new Date().toISOString() })
    .eq('id', p.id).in('status', ['created', 'failed']).select('*').maybeSingle();
  if (!claimed) { const { data } = await supabase.from('payments').select('*').eq('id', p.id).single(); return { payment: data, credited: false }; }
  const via = p.provider === 'razorpay' ? 'Razorpay' : 'Stripe';
  let balance = await walletApply(p.user_id, Number(p.amount), { type: 'credit', description: `Wallet recharge via ${via}`, reference: `PAY${p.id}` });
  if (Number(p.bonus) > 0) balance = await walletApply(p.user_id, Number(p.bonus), { type: 'credit', description: `${bonusPct(Number(p.amount))}% recharge bonus`, reference: `PAY${p.id}-BONUS` });
  await supabase.from('notifications').insert({ user_id: p.user_id, audience: 'customer', type: 'wallet', title: 'Wallet recharged', body: `₹${p.amount}${Number(p.bonus) ? ` + ₹${p.bonus} bonus` : ''} added. New balance ₹${balance}.` });
  return { payment: claimed, credited: true, balance };
}

export async function verifyRazorpay(p, paymentId) {
  const payments = paymentId ? [await rzp(`/payments/${encodeURIComponent(paymentId)}`)] : (await rzp(`/orders/${encodeURIComponent(p.provider_order_id)}/payments`)).items || [];
  const expected = Math.round(Number(p.amount) * 100);
  for (let pay of payments) {
    if (pay.order_id !== p.provider_order_id || Number(pay.amount) !== expected || pay.currency !== 'INR') continue;
    if (pay.status === 'authorized') pay = await rzp(`/payments/${pay.id}/capture`, { method: 'POST', body: JSON.stringify({ amount: expected, currency: 'INR' }) });
    if (pay.status === 'captured') return credit(p, pay.id);
  }
  return { payment: p, credited: false };
}
export async function verifyStripe(p) {
  const s = await stripe(`/checkout/sessions/${encodeURIComponent(p.provider_order_id)}`);
  if (s.payment_status === 'paid' && Number(s.amount_total) === Math.round(Number(p.amount) * 100) && String(s.currency).toLowerCase() === 'inr' && String(s.metadata?.payment_id) === String(p.id)) return credit(p, s.payment_intent || s.id);
  return { payment: p, credited: false };
}

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  try {
    // Provider webhooks: bodies are treated as untrusted hints; the payment is re-verified via the provider API.
    if (req.method === 'POST' && req.query.webhook) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      let orderId = null;
      if (req.query.webhook === 'razorpay' && rzpOn()) orderId = body?.payload?.payment?.entity?.order_id || body?.payload?.order?.entity?.id;
      if (req.query.webhook === 'stripe' && stripeOn() && String(body?.type || '').startsWith('checkout.session')) orderId = body?.data?.object?.id;
      if (orderId) {
        const { data: p } = await supabase.from('payments').select('*').eq('provider_order_id', orderId).maybeSingle();
        if (p && p.status !== 'paid') await (p.provider === 'razorpay' ? verifyRazorpay(p) : verifyStripe(p));
      }
      return res.status(200).json({ received: true });
    }

    if (req.method === 'GET' && req.query.config) {
      return res.status(200).json({ razorpay: rzpOn(), stripe: stripeOn() });
    }

    const { user, profile } = await requireRole(req, ['customer']);

    if (req.method === 'GET') {
      const { data } = await supabase.from('payments').select('id, provider, amount, bonus, status, created_at, paid_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      return res.status(200).json(data || []);
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { action } = req.body || {};

    if (action === 'create') {
      const provider = req.body.provider;
      const amount = Math.round(Number(req.body.amount));
      if (!amount || amount < 50) throw httpError(400, 'Minimum recharge is ₹50');
      if (amount > 100000) throw httpError(400, 'Maximum recharge is ₹1,00,000');
      if (provider === 'razorpay' && !rzpOn()) throw httpError(503, 'Razorpay is not configured yet');
      if (provider === 'stripe' && !stripeOn()) throw httpError(503, 'Stripe is not configured yet');
      if (!['razorpay', 'stripe'].includes(provider)) throw httpError(400, 'Choose a payment provider');
      const bonus = Math.round((amount * bonusPct(amount)) / 100);
      const { data: p, error } = await supabase.from('payments').insert({ user_id: user.id, provider, purpose: 'wallet_recharge', amount, bonus, currency: 'INR', status: 'created' }).select().single();
      if (error) throw error;
      if (provider === 'razorpay') {
        const order = await rzp('/orders', { method: 'POST', body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt: `AV${p.id}`, notes: { payment_id: String(p.id), user_id: user.id } }) });
        await supabase.from('payments').update({ provider_order_id: order.id }).eq('id', p.id);
        return res.status(201).json({ provider, payment_id: p.id, key_id: process.env.RAZORPAY_KEY_ID, order_id: order.id, amount: amount * 100, currency: 'INR', name: profile.full_name, email: profile.email, phone: profile.phone || '' });
      }
      const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
      const s = await stripe('/checkout/sessions', {
        mode: 'payment', 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'inr', 'line_items[0][price_data][unit_amount]': String(amount * 100),
        'line_items[0][price_data][product_data][name]': 'Astro Venus wallet recharge', client_reference_id: String(p.id), 'metadata[payment_id]': String(p.id),
        customer_email: profile.email || '', success_url: `${origin}/dashboard/wallet?stripe_payment=${p.id}`, cancel_url: `${origin}/dashboard/wallet?stripe_cancelled=${p.id}`,
      });
      await supabase.from('payments').update({ provider_order_id: s.id }).eq('id', p.id);
      return res.status(201).json({ provider, payment_id: p.id, url: s.url });
    }

    if (action === 'verify') {
      const { data: p } = await supabase.from('payments').select('*').eq('id', Number(req.body.payment_id)).maybeSingle();
      if (!p || p.user_id !== user.id) throw httpError(404, 'Payment not found');
      if (p.status === 'paid') return res.status(200).json({ status: 'paid', credited: false });
      let r;
      if (p.provider === 'razorpay') {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (razorpay_signature) {
          const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
          if (razorpay_order_id !== p.provider_order_id || !safeEq(expected, razorpay_signature)) throw httpError(400, 'Payment signature verification failed');
        }
        r = await verifyRazorpay(p, razorpay_payment_id);
      } else r = await verifyStripe(p);
      return res.status(200).json({ status: r.payment.status, credited: r.credited, balance: r.balance, amount: p.amount, bonus: p.bonus });
    }

    if (action === 'cancel') {
      await supabase.from('payments').update({ status: 'failed' }).eq('id', Number(req.body.payment_id)).eq('user_id', user.id).eq('status', 'created');
      return res.status(200).json({ ok: true });
    }
    throw httpError(400, 'Unknown action');
  } catch (err) {
    send(res, err);
  }
}
