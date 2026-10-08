import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Server, Database, KeyRound, Plug, CreditCard, Video, Wallet, ShieldCheck, UserCheck, Bell, BarChart3, Lock, Scale, Cloud, FlaskConical, Rocket, Check, ChevronDown, RotateCcw, Printer } from 'lucide-react';
import { StarField } from '../components/Celestial';

type Status = 'done' | 'partial' | 'todo';
type Priority = 'P0' | 'P1' | 'P2';
interface Item { t: string; d?: string; p: Priority; s: Status }
interface Section { key: string; title: string; icon: any; intro: string; items: Item[] }

const SECTIONS: Section[] = [
  { key: 'stack', title: 'Tech stack', icon: Server, intro: 'Current stack: Vite + React 19 + TypeScript + Tailwind v4 frontend, Vercel serverless functions (Node) for the API, Supabase Postgres + Auth + Storage. It is a good base; production needs the additions below.', items: [
    { t: 'Keep React/Vite SPA on Vercel; code-split dashboards (admin, astro panel, consultation) with React.lazy', d: 'Current bundle is ~1 MB in one chunk.', p: 'P1', s: 'todo' },
    { t: 'Move API routes to TypeScript with a shared validation layer (Zod) for every request body', p: 'P1', s: 'todo' },
    { t: 'Upgrade Supabase to Pro (daily backups, PITR, no auto-pause) in the Mumbai region (ap-south-1)', p: 'P0', s: 'todo' },
    { t: 'Add a job/queue runner for reminders, payouts and webhooks (Supabase Cron + Edge Functions, or Inngest/Trigger.dev)', p: 'P0', s: 'todo' },
    { t: 'Native apps: wrap with Capacitor or build React Native (Expo) sharing the same API for App Store / Play Store listings', p: 'P2', s: 'todo' },
  ] },
  { key: 'schema', title: 'Database schema', icon: Database, intro: 'Existing tables: profiles, astrologers, services, bookings, consultations, messages, transactions, reviews, favorites, withdrawals, coupons, notifications, kundlis, horoscopes, blogs, testimonials, support_tickets, settings, plus wallet_ledger (atomic, append-only), payments, consultation_sessions and consents.', items: [
    { t: 'Core tables with foreign keys for astrologers → bookings / consultations / reviews / favorites / withdrawals', p: 'P0', s: 'done' },
    { t: 'Add payments table: gateway, gateway_order_id, gateway_payment_id, amount, currency, status, raw webhook JSON, idempotency_key (unique)', d: 'Done: payments table with compare-and-swap status (created → paid) so each payment credits exactly once.', p: 'P0', s: 'done' },
    { t: 'Convert transactions into an immutable double-entry ledger (wallet_entries with balance_after); wallet balance derived or reconciled nightly', d: 'Done: wallet_ledger rows keyed by user:seq; balance is the latest balance_after.', p: 'P0', s: 'done' },
    { t: 'Add user_roles (user_id, role) and admin_audit_logs (actor, action, entity, before, after, ip)', p: 'P0', s: 'todo' },
    { t: 'Add call_sessions (provider, channel, token expiry, recording_url, billed_seconds) and device_tokens (push)', d: 'consultation_sessions done; device_tokens pending push integration.', p: 'P0', s: 'partial' },
    { t: 'Add payouts (astrologer, period, gross, commission, TDS, net, utr) and invoices (GST number, invoice_no series)', p: 'P1', s: 'todo' },
    { t: 'Indexes: bookings(astrologer_id, scheduled_at), consultations(user_id, status), messages(consultation_id, id), transactions(user_id, created_at)', p: 'P0', s: 'todo' },
    { t: 'Unique constraints: favorites(user_id, astrologer_id), astrologers(slug), coupons(code); exclusion constraint to stop double-booked slots', p: 'P0', s: 'todo' },
    { t: 'Manage schema with versioned SQL migrations (supabase/migrations) and seed scripts', d: 'supabase/migrations/0002_security_hardening.sql added.', p: 'P1', s: 'partial' },
  ] },
  { key: 'auth', title: 'Auth & roles', icon: KeyRound, intro: 'CUSTOMER, ASTROLOGER and ADMIN roles are enforced on every API route (401 when signed out, 403 for the wrong role) and on every dashboard route. Sign-ups are always customers; only admins can grant roles.', items: [
    { t: 'Email/password + Google sign-in via Supabase Auth', p: 'P0', s: 'done' },
    { t: 'Phone OTP login (the norm for Indian users) via Supabase + MSG91/Twilio Verify', p: 'P0', s: 'todo' },
    { t: 'Enforce roles on every API route: customer, astrologer, admin (see Admin roles). Today any signed-in user can open /admin and /astro-panel', d: 'Done: requireRole() on the server, RoleRoute + 403 page on the client.', p: 'P0', s: 'done' },
    { t: 'Link each astrologer account to exactly one auth user (astrologers.user_id); remove the "pick a profile" workspace picker', p: 'P0', s: 'done' },
    { t: 'Email verification, password reset page, session revoke on password change', p: 'P1', s: 'todo' },
    { t: 'Mandatory 2FA (TOTP) for admin and finance roles', p: 'P1', s: 'todo' },
    { t: 'Account deletion + data export flow (required by app stores and DPDP Act)', p: 'P0', s: 'done' },
  ] },
  { key: 'api', title: 'APIs', icon: Plug, intro: 'Current endpoints: /api/astrologers, /api/me (incl. Kundli, export, delete), /api/bookings, /api/consultations, /api/payments, /api/reviews, /api/content, /api/astro-panel, /api/admin.', items: [
    { t: 'REST endpoints for all customer, astrologer and admin features', p: 'P0', s: 'done' },
    { t: 'Add /api/payments/create-order, /api/payments/verify, /api/webhooks/razorpay, /api/webhooks/stripe', d: 'Done as /api/payments (create, verify, cancel) and /api/payments?webhook=razorpay|stripe.', p: 'P0', s: 'done' },
    { t: 'Add /api/calls/token (Agora/Twilio/LiveKit token server) and /api/calls/heartbeat for server-side billing', d: 'Done with LiveKit: call_token + heartbeat actions on /api/consultations and /api/astro-panel.', p: 'P0', s: 'done' },
    { t: 'Move wallet debits, booking creation and consultation end into Postgres functions (RPC) run inside one transaction with row locks', d: 'Implemented without RPC: every wallet change is one atomic insert with a primary-key compare-and-swap; bookings, refunds, minute charges and payment credits use status CAS. Optional RPC migration later.', p: 'P0', s: 'done' },
    { t: 'Rate limiting per IP and per user (Upstash Redis / Vercel KV) on auth, messages, coupons, payments', p: 'P0', s: 'todo' },
    { t: 'Consistent error format, request IDs, pagination on all list endpoints', p: 'P1', s: 'partial' },
    { t: 'OpenAPI document for the mobile app team', p: 'P2', s: 'todo' },
  ] },
  { key: 'payments', title: 'Payments (Razorpay / Stripe)', icon: CreditCard, intro: 'Razorpay (India) and Stripe (international) are integrated server-side. The wallet is credited only after the server confirms the payment with the provider API. Add the keys to go live.', items: [
    { t: 'Razorpay as primary gateway for India (UPI, cards, netbanking, wallets); Stripe for international cards', p: 'P0', s: 'done' },
    { t: 'Flow: server creates order → Checkout on client → verify signature server-side → credit wallet only after verified webhook (payment.captured)', p: 'P0', s: 'done' },
    { t: 'Idempotent webhook handling (store event id, ignore repeats); reconcile daily against gateway settlement reports', d: 'Idempotent credits + admin Reconcile button done; scheduled daily reconciliation pending.', p: 'P0', s: 'partial' },
    { t: 'Refunds: wallet refunds instantly; card/UPI refunds through gateway refund API with status tracking', p: 'P0', s: 'partial' },
    { t: 'Astrologer payouts via RazorpayX Payouts (or Stripe Connect abroad) after KYC + bank penny-drop verification', p: 'P1', s: 'todo' },
    { t: 'GST on platform fee, GST-compliant invoices, TDS on astrologer payouts; confirm rates with a CA', p: 'P0', s: 'todo' },
    { t: 'Add keys in Secrets tab: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET', p: 'P0', s: 'todo' },
    { t: 'Coupon rules enforced server-side (min order, max discount, expiry)', p: 'P0', s: 'done' },
    { t: 'Add per-user coupon limits and first-order-only rules', p: 'P1', s: 'todo' },
  ] },
  { key: 'rtc', title: 'Real-time chat, call & video', icon: Video, intro: 'Audio/video run on LiveKit with server-minted tokens. Billing is server-authoritative: charged per started minute from server clocks and LiveKit room presence. Chat still polls, and the chat auto-assistant replies until the astrologer answers.', items: [
    { t: 'Chat UI, voice notes (Supabase Storage), typing indicator, transcript history', p: 'P0', s: 'done' },
    { t: 'Replace polling with Supabase Realtime subscriptions on messages and consultations', p: 'P0', s: 'todo' },
    { t: 'Remove the automatic astrologer replies; astrologer must accept a request within 60 s or it auto-cancels with no charge', d: 'Calls auto-end free if the astrologer does not join within 90 s; chat auto-assistant still active.', p: 'P0', s: 'partial' },
    { t: 'Integrate Agora (or Twilio Video / LiveKit) for audio + video: channel per consultation, short-lived tokens from /api/calls/token', d: 'LiveKit chosen. Add LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET in Secrets.', p: 'P0', s: 'done' },
    { t: 'Phone-bridge calls (masked numbers) via Exotel/Twilio Voice for users on poor data connections', p: 'P2', s: 'todo' },
    { t: 'Server-side billing: bill from provider join/leave events or 15 s heartbeats, never from the client timer', p: 'P0', s: 'done' },
    { t: 'Auto-end when wallet reaches zero (server enforced); reconnect grace period of 60 s without billing', p: 'P0', s: 'done' },
    { t: 'Optional recording with explicit consent, stored in a private bucket with retention policy', p: 'P2', s: 'todo' },
    { t: 'Incoming session alerts for astrologers: push + ringtone + in-app banner', p: 'P0', s: 'partial' },
  ] },
  { key: 'wallet', title: 'Wallet & booking logic', icon: Wallet, intro: 'Per-minute billing, bookings, rescheduling, cancellation refunds, coupons and slot-conflict checks already work.', items: [
    { t: 'Per-minute billing with 3-minute minimum balance, low-balance alert, in-session recharge', p: 'P0', s: 'done' },
    { t: 'Booking flow with slot conflict checks, reschedule, cancel with tiered refund (100% ≥2 h, 50% <2 h)', p: 'P0', s: 'done' },
    { t: 'Make all wallet changes atomic (single SQL function with SELECT … FOR UPDATE) to prevent double spending', d: 'Done via atomic ledger inserts (primary-key CAS).', p: 'P0', s: 'done' },
    { t: 'Hold (reserve) wallet funds at session start; settle at end — prevents overspending across tabs', d: 'Each minute is charged in advance from the ledger; only one active session per customer.', p: 'P0', s: 'done' },
    { t: 'Store astrologer time zone; show slots in both customer and astrologer local time', p: 'P1', s: 'todo' },
    { t: 'Reminders 24 h and 15 min before sessions; astrologer no-show → automatic full refund + penalty flag', p: 'P0', s: 'todo' },
    { t: 'Leave/holiday blocking for astrologers in addition to weekly hours', p: 'P1', s: 'todo' },
    { t: 'Nightly reconciliation job: ledger sum vs profile balance; alert on mismatch', p: 'P0', s: 'todo' },
  ] },
  { key: 'admin', title: 'Admin controls & roles', icon: ShieldCheck, intro: 'The admin console covers users, astrologers, KYC, bookings, sessions, payments, commission, withdrawals, coupons, reviews, content and reports — but is not access-restricted.', items: [
    { t: 'All 20 admin sections with tables, edit forms, CSV export and charts', p: 'P0', s: 'done' },
    { t: 'Roles: super_admin, operations, finance, support, content editor, moderator — permissions checked on server', d: 'Customer / astrologer / admin enforced; finer admin sub-roles pending.', p: 'P0', s: 'partial' },
    { t: 'Audit log for every admin action (wallet adjustments, refunds, KYC decisions, commission changes)', p: 'P0', s: 'todo' },
    { t: 'Maker-checker approval for payouts and manual wallet credits above a threshold', p: 'P1', s: 'todo' },
    { t: 'Per-astrologer commission overrides and promotional pricing', p: 'P2', s: 'todo' },
    { t: 'Live session monitor with ability to end abusive sessions and ban users/astrologers', p: 'P1', s: 'partial' },
  ] },
  { key: 'kyc', title: 'KYC flow', icon: UserCheck, intro: 'Astrologers submit PAN, Aadhaar (stored masked), bank details and an ID file; admin approves or rejects and the verified badge is applied.', items: [
    { t: 'Submission form, format checks, admin review, verified badge on approval', p: 'P0', s: 'done' },
    { t: 'Move kyc-docs bucket to PRIVATE with signed URLs (currently public)', p: 'P0', s: 'done' },
    { t: 'Automated verification via a licensed provider (e.g. Signzy, IDfy, HyperVerge): PAN verify, Aadhaar offline e-KYC/DigiLocker, bank penny drop', p: 'P0', s: 'todo' },
    { t: 'Liveness selfie match against ID photo', p: 'P1', s: 'todo' },
    { t: 'Never store full Aadhaar numbers; encrypt bank details at rest; retention and deletion policy', p: 'P0', s: 'partial' },
    { t: 'Astrologer onboarding: skills interview, sample reading, signed service agreement before going live', p: 'P1', s: 'todo' },
  ] },
  { key: 'notify', title: 'Notifications', icon: Bell, intro: 'In-app notifications and admin broadcasts exist. No push, email, SMS or WhatsApp yet.', items: [
    { t: 'In-app notification centre for customers and astrologers; admin broadcasts', p: 'P0', s: 'done' },
    { t: 'Push notifications via Firebase Cloud Messaging (web + Android) and APNs (iOS)', p: 'P0', s: 'todo' },
    { t: 'Transactional email via Resend / Amazon SES: receipts, booking confirmations, password reset', p: 'P0', s: 'todo' },
    { t: 'SMS/WhatsApp via MSG91 or Twilio — register sender IDs and templates on TRAI DLT (mandatory in India)', p: 'P0', s: 'todo' },
    { t: 'User notification preferences and quiet hours; marketing opt-in kept separate from transactional', p: 'P1', s: 'todo' },
  ] },
  { key: 'analytics', title: 'Analytics & monitoring', icon: BarChart3, intro: 'Admin analytics charts exist from database data. No product analytics or error monitoring yet.', items: [
    { t: 'Admin revenue, sessions, user growth and rating charts', p: 'P1', s: 'done' },
    { t: 'Product analytics (PostHog or GA4): funnels for signup → recharge → first consultation, retention cohorts', p: 'P1', s: 'todo' },
    { t: 'Error monitoring with Sentry on frontend and API routes', p: 'P0', s: 'todo' },
    { t: 'Uptime checks and alerting (Better Stack / UptimeRobot) on site, API and webhooks', p: 'P0', s: 'todo' },
    { t: 'Structured logs with request IDs; alert on payment webhook failures and wallet mismatches', p: 'P0', s: 'todo' },
  ] },
  { key: 'security', title: 'Security', icon: Lock, intro: 'API routes use the service-role key and only check that a user is signed in, not what they may access.', items: [
    { t: 'Authorisation on every route: users can only touch their own bookings, wallet, kundlis; astrologers only their own panel data', p: 'P0', s: 'done' },
    { t: 'Enable Row Level Security on all tables as defence in depth', d: 'Deny policies created; run supabase/migrations/0002_security_hardening.sql in the Supabase SQL editor to switch RLS on.', p: 'P0', s: 'partial' },
    { t: 'Make voice-notes bucket private; serve with short-lived signed URLs', p: 'P0', s: 'done' },
    { t: 'Security headers: CSP, HSTS, X-Frame-Options, Referrer-Policy (via vercel.json headers)', p: 'P0', s: 'todo' },
    { t: 'Secrets only in environment variables; rotate service-role key before launch', p: 'P0', s: 'partial' },
    { t: 'Abuse controls: block phone numbers/UPI IDs/links in chat, profanity filter, report button', d: 'Contact/link blocking done.', p: 'P1', s: 'partial' },
    { t: 'Third-party penetration test and dependency audit (npm audit, Dependabot)', p: 'P1', s: 'todo' },
  ] },
  { key: 'legal', title: 'Legal & compliance', icon: Scale, intro: 'Get these reviewed by a lawyer and a chartered accountant — this list is a starting point, not legal advice.', items: [
    { t: 'Terms of Service, Privacy Policy, Refund & Cancellation Policy, Astrologer Agreement pages', d: 'Published at /legal. Company details marked TO BE COMPLETED; needs lawyer review.', p: 'P0', s: 'done' },
    { t: 'Entertainment/guidance disclaimer on every consultation (footer disclaimer exists)', p: 'P0', s: 'done' },
    { t: 'India DPDP Act 2023: consent notices, purpose limitation, data deletion, breach response plan', d: 'Consent records, data export and deletion done; breach runbook pending.', p: 'P0', s: 'partial' },
    { t: 'Consumer Protection (E-Commerce) Rules: grievance officer name & contact, seller (astrologer) details shown', d: 'Grievance page live; officer name and company CIN/GSTIN must be filled in.', p: 'P0', s: 'partial' },
    { t: 'GST registration, invoicing and TDS/TCS obligations for marketplace payouts', p: 'P0', s: 'todo' },
    { t: '18+ age gate; no medical, legal or financial guarantees in marketing or astrologer claims', p: 'P0', s: 'done' },
    { t: 'GDPR basics if serving UK/EU users (Stripe international)', p: 'P2', s: 'todo' },
    { t: 'Register the Astro Rahu trademark and secure domain and social handles', p: 'P1', s: 'todo' },
  ] },
  { key: 'hosting', title: 'Hosting & infrastructure', icon: Cloud, intro: 'Frontend and API on Vercel; database, auth and storage on Supabase.', items: [
    { t: 'Vercel Pro with custom domain (AstroRahu.com), HTTPS, preview deployments per branch', p: 'P0', s: 'partial' },
    { t: 'Proper SPA rewrites in vercel.json so deep links return 200 (currently served through a 404.html fallback)', p: 'P0', s: 'todo' },
    { t: 'Supabase Pro in Mumbai, point-in-time recovery, separate staging and production projects', p: 'P0', s: 'todo' },
    { t: 'Image optimisation (WebP/AVIF, resized astrologer photos) and CDN caching for static assets', p: 'P1', s: 'todo' },
    { t: 'Set API function region to bom1 (Mumbai) to sit next to the database', p: 'P1', s: 'todo' },
    { t: 'Documented backup restore drill and disaster-recovery runbook', p: 'P1', s: 'todo' },
  ] },
  { key: 'qa', title: 'Quality assurance', icon: FlaskConical, intro: 'The production build compiles. No automated tests exist yet.', items: [
    { t: 'Unit tests for billing, refund tiers, coupon maths, Kundli calculations (Vitest)', p: 'P0', s: 'todo' },
    { t: 'End-to-end tests (Playwright): signup → recharge → chat → end → rate; booking → reschedule → cancel; admin refund', p: 'P0', s: 'todo' },
    { t: 'Payment tests in Razorpay/Stripe test mode incl. failed, pending and duplicate webhooks', p: 'P0', s: 'todo' },
    { t: 'Load test (k6): 1,000 concurrent chat sessions and booking spikes', p: 'P1', s: 'todo' },
    { t: 'Device matrix: iOS Safari, Android Chrome, low-end Android, desktop Chrome/Safari/Edge; slow 3G', p: 'P0', s: 'todo' },
    { t: 'Accessibility pass (WCAG 2.1 AA): contrast, focus states, screen-reader labels', p: 'P1', s: 'partial' },
    { t: 'Kundli accuracy check against professional software; move to Swiss Ephemeris if precision matters', p: 'P1', s: 'todo' },
  ] },
  { key: 'golive', title: 'Go-live plan', icon: Rocket, intro: 'A suggested sequence. Adjust dates to your team size.', items: [
    { t: 'T-6 weeks: lock scope, finish P0 security (roles, RLS, private buckets), start Razorpay KYC for the business account', p: 'P0', s: 'todo' },
    { t: 'T-4 weeks: payments, Agora calls, push/SMS live on staging; onboard and KYC 25–50 astrologers', p: 'P0', s: 'todo' },
    { t: 'T-2 weeks: closed beta with ~200 invited users, real money, daily bug triage; legal pages published', p: 'P0', s: 'todo' },
    { t: 'T-1 week: load test, pen-test fixes, support team trained, runbooks and on-call rota ready', p: 'P0', s: 'todo' },
    { t: 'Launch day: feature-flag gradual rollout, war room, live dashboards for payments/sessions/errors', p: 'P0', s: 'todo' },
    { t: 'Rollback plan: previous Vercel deployment one click away; payments kill-switch; status page', p: 'P0', s: 'todo' },
    { t: 'T+2 weeks: review funnels, refund rate, astrologer response time, NPS; plan app store release', p: 'P1', s: 'todo' },
  ] },
];

const STORE = 'av_launch_checklist';
const S_STYLE: Record<Status, string> = { done: 'bg-emerald-50 text-emerald-700', partial: 'bg-amber-50 text-amber-700', todo: 'bg-stone-100 text-stone-600' };
const S_LABEL: Record<Status, string> = { done: 'Built', partial: 'Partial', todo: 'To do' };
const P_STYLE: Record<Priority, string> = { P0: 'bg-rose-50 text-rose-deep', P1: 'bg-[#FFF3D9] text-gold-deep', P2: 'bg-lilac text-plum' };

export default function LaunchChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } });
  const [open, setOpen] = useState<string | null>(SECTIONS[0].key);
  const [filter, setFilter] = useState<'all' | Priority>('all');
  useEffect(() => { localStorage.setItem(STORE, JSON.stringify(checked)); }, [checked]);

  const all = useMemo(() => SECTIONS.flatMap((s) => s.items.map((it, i) => ({ id: `${s.key}-${i}`, ...it }))), []);
  const isDone = (id: string, s: Status) => checked[id] ?? s === 'done';
  const total = all.length;
  const doneCount = all.filter((i) => isDone(i.id, i.s)).length;
  const p0 = all.filter((i) => i.p === 'P0');
  const p0Done = p0.filter((i) => isDone(i.id, i.s)).length;
  const pct = Math.round((doneCount / total) * 100);

  return (
    <div>
      <section className="relative bg-plum-grad overflow-hidden">
        <StarField count={50} seed={101} color="#E8CD8A" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <p className="text-[11px] tracking-[0.35em] uppercase text-gold-light font-medium">Production readiness</p>
          <h1 className="font-display text-4xl sm:text-5xl text-white mt-3">Launch <span className="font-serif italic font-medium text-gold-grad">checklist</span></h1>
          <p className="text-white/65 mt-3 max-w-2xl">Everything Astro Rahu needs before real users and real money. Status reflects what is built in this app today; tick items as your team completes them (saved in this browser).</p>
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-xl">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4"><p className="font-display text-3xl text-gold-grad">{pct}%</p><p className="text-[11px] uppercase tracking-wider text-white/60">Overall</p></div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4"><p className="font-display text-3xl text-white">{p0Done}/{p0.length}</p><p className="text-[11px] uppercase tracking-wider text-white/60">P0 blockers</p></div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4"><p className="font-display text-3xl text-white">{doneCount}/{total}</p><p className="text-[11px] uppercase tracking-wider text-white/60">Items</p></div>
          </div>
          <div className="h-2 rounded-full bg-white/10 mt-6 max-w-xl overflow-hidden"><div className="h-full bg-gold-grad transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(['all', 'P0', 'P1', 'P2'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'chip-active' : ''}`}>{f === 'all' ? 'All priorities' : f === 'P0' ? 'P0 · launch blocker' : f === 'P1' ? 'P1 · launch month' : 'P2 · post-launch'}</button>)}
          <span className="flex-1" />
          <button onClick={() => window.print()} className="btn btn-outline btn-sm"><Printer className="h-4 w-4" /> Print</button>
          <button onClick={() => setChecked({})} className="btn btn-ghost btn-sm"><RotateCcw className="h-4 w-4" /> Reset ticks</button>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          <nav className="hidden lg:block"><div className="card p-3 sticky top-24 space-y-0.5">
            {SECTIONS.map((s) => { const items = all.filter((i) => i.id.startsWith(s.key + '-')); const d = items.filter((i) => isDone(i.id, i.s)).length; return (
              <button key={s.key} onClick={() => { setOpen(s.key); document.getElementById(`sec-${s.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left ${open === s.key ? 'bg-blush text-rose-deep' : 'hover:bg-cream'}`}>
                <s.icon className="h-4 w-4 shrink-0" /><span className="flex-1 truncate">{s.title}</span><span className="text-[11px] text-muted">{d}/{items.length}</span>
              </button>
            ); })}
          </div></nav>

          <div className="space-y-4">
            {SECTIONS.map((s) => {
              const items = s.items.map((it, i) => ({ id: `${s.key}-${i}`, ...it })).filter((i) => filter === 'all' || i.p === filter);
              if (!items.length) return null;
              const d = items.filter((i) => isDone(i.id, i.s)).length;
              const isOpen = open === s.key || filter !== 'all';
              return (
                <section key={s.key} id={`sec-${s.key}`} className="card overflow-hidden scroll-mt-24">
                  <button onClick={() => setOpen(open === s.key ? null : s.key)} className="w-full flex items-center gap-4 p-5 text-left">
                    <span className="h-11 w-11 rounded-2xl bg-gold-grad flex items-center justify-center shrink-0"><s.icon className="h-5 w-5 text-plum-deep" /></span>
                    <div className="flex-1 min-w-0"><h2 className="font-serif text-xl font-semibold text-plum">{s.title}</h2><div className="h-1.5 rounded-full bg-cream mt-2 max-w-xs overflow-hidden"><div className="h-full bg-rose-grad" style={{ width: `${(d / items.length) * 100}%` }} /></div></div>
                    <span className="text-sm text-muted">{d}/{items.length}</span>
                    <ChevronDown className={`h-5 w-5 text-muted transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-5">
                      <p className="text-sm text-muted mb-3 leading-relaxed">{s.intro}</p>
                      <ul className="divide-y divide-line">
                        {items.map((it) => { const on = isDone(it.id, it.s); return (
                          <li key={it.id} className="flex items-start gap-3 py-3">
                            <button onClick={() => setChecked((c) => ({ ...c, [it.id]: !on }))} aria-label="Toggle done" className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${on ? 'bg-rose border-rose text-white' : 'border-line hover:border-rose'}`}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-relaxed ${on ? 'text-muted line-through decoration-rose/40' : 'text-ink'}`}>{it.t}</p>
                              {it.d && <p className="text-xs text-muted mt-0.5">{it.d}</p>}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-1 items-end shrink-0">
                              <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${P_STYLE[it.p]}`}>{it.p}</span>
                              <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${S_STYLE[it.s]}`}>{S_LABEL[it.s]}</span>
                            </div>
                          </li>
                        ); })}
                      </ul>
                    </motion.div>
                  )}
                </section>
              );
            })}
            <div className="card gold-border p-6 text-center">
              <p className="font-serif text-2xl text-plum">Ready when every P0 is ticked</p>
              <p className="text-sm text-muted mt-1">Legal and tax items should be confirmed with a lawyer and a chartered accountant.</p>
              <Link to="/admin" className="btn btn-rose mt-4">Open admin console</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
