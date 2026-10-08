-- Rahu Talk · security hardening migration
-- Run once in Supabase Dashboard → SQL Editor (requires the postgres role).
-- The app's API uses the service-role key, which bypasses RLS, so enabling RLS does not break the app.
-- It closes direct table access with the public anon key (currently possible).

-- 1) Enable Row Level Security on every application table.
--    "deny_client_access" policies (USING false) already exist on each table.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','astrologers','services','bookings','consultations','consultation_sessions','messages',
    'wallet_ledger','transactions','payments','reviews','favorites','withdrawals','coupons','notifications',
    'kundlis','horoscopes','blogs','testimonials','support_tickets','settings','consents'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- 2) Drop any pre-existing permissive policies other than the deny policy.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and policyname <> 'deny_client_access' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 3) Integrity constraints that back the application-level atomicity.
create unique index if not exists wallet_ledger_user_seq_uq on public.wallet_ledger (user_id, seq);
create index if not exists wallet_ledger_user_seq_desc on public.wallet_ledger (user_id, seq desc);
create unique index if not exists payments_provider_order_uq on public.payments (provider, provider_order_id) where provider_order_id is not null;
create unique index if not exists favorites_user_astro_uq on public.favorites (user_id, astrologer_id);
create unique index if not exists astrologers_slug_uq on public.astrologers (slug);
create unique index if not exists astrologers_user_uq on public.astrologers (user_id) where user_id is not null;
create unique index if not exists coupons_code_uq on public.coupons (code);
create unique index if not exists reviews_consultation_uq on public.reviews (consultation_id) where consultation_id is not null;
create index if not exists bookings_astro_time on public.bookings (astrologer_id, scheduled_at);
create index if not exists consultations_user_status on public.consultations (user_id, status);
create index if not exists messages_consultation_id on public.messages (consultation_id, id);

-- 4) Wallet can never go negative, even if application code is bypassed.
alter table public.wallet_ledger drop constraint if exists wallet_ledger_non_negative;
alter table public.wallet_ledger add constraint wallet_ledger_non_negative check (balance_after >= 0) not valid; -- enforced for all new entries

-- 5) Private storage: voice notes and KYC documents must never be public.
update storage.buckets set public = false where id in ('voice-notes', 'kyc-docs');
