import { api } from './api';

export type Provider = 'razorpay' | 'stripe';

let rzpLoader: Promise<void> | null = null;
function loadRazorpay() {
  if ((window as any).Razorpay) return Promise.resolve();
  if (!rzpLoader) rzpLoader = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => { rzpLoader = null; reject(new Error('Could not load Razorpay checkout')); };
    document.body.appendChild(s);
  });
  return rzpLoader;
}

export async function getPaymentConfig(): Promise<{ razorpay: boolean; stripe: boolean }> {
  try { return await api('/api/payments?config=1'); } catch { return { razorpay: false, stripe: false }; }
}

/**
 * Start a wallet recharge. The wallet is only credited after the server confirms the payment
 * directly with the provider. Resolves with the verified result (Razorpay) or 'redirected' (Stripe).
 */
export async function startRecharge(amount: number, provider: Provider): Promise<{ credited: boolean; balance?: number; bonus?: number } | 'redirected' | 'dismissed'> {
  const order = await api('/api/payments', { method: 'POST', body: { action: 'create', provider, amount } });
  if (provider === 'stripe') {
    const w = window.open(order.url, '_blank');
    if (!w) window.location.assign(order.url);
    return 'redirected';
  }
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.key_id, order_id: order.order_id, amount: order.amount, currency: order.currency,
      name: 'Astro Venus', description: 'Wallet recharge', prefill: { name: order.name, email: order.email, contact: order.phone },
      theme: { color: '#D9678A' },
      handler: async (resp: any) => {
        try { resolve(await api('/api/payments', { method: 'POST', body: { action: 'verify', payment_id: order.payment_id, ...resp } })); } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => { api('/api/payments', { method: 'POST', body: { action: 'cancel', payment_id: order.payment_id } }).catch(() => {}); resolve('dismissed'); } },
    });
    rzp.on('payment.failed', (r: any) => reject(new Error(r?.error?.description || 'Payment failed')));
    rzp.open();
  });
}

export async function verifyStripeReturn(paymentId: number) {
  return api('/api/payments', { method: 'POST', body: { action: 'verify', payment_id: paymentId } });
}
