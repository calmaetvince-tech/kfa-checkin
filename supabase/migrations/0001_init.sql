-- Maitai Gym — initial schema
-- Apply via: supabase db push  (or paste in SQL editor)
-- Requires extensions: pgcrypto for gen_random_bytes / gen_random_uuid

create extension if not exists "pgcrypto";

-- ============================================================
-- admins: which auth users are gym owners (full access)
-- ============================================================
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Helper: is the calling auth user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ============================================================
-- members: gym members. Added only by owner. qr_token is the secret in the QR.
-- ============================================================
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  qr_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  subscription_renewed_at timestamptz,
  subscription_expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists members_qr_token_idx on public.members(qr_token);
create index if not exists members_expires_idx on public.members(subscription_expires_at);

-- ============================================================
-- check_ins: one row per gym visit
-- ============================================================
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  checked_in_at timestamptz not null default now()
);

create index if not exists check_ins_member_idx on public.check_ins(member_id);
create index if not exists check_ins_at_idx on public.check_ins(checked_in_at desc);

-- ============================================================
-- RLS
-- Members and check_ins: only admins via the anon/auth keys.
-- The member-facing /m/[token] page reads through the service-role key
-- on the server (bypasses RLS) — never expose service role to the client.
-- ============================================================
alter table public.admins enable row level security;
alter table public.members enable row level security;
alter table public.check_ins enable row level security;

drop policy if exists "admins self read" on public.admins;
create policy "admins self read" on public.admins
  for select using (auth.uid() = user_id);

drop policy if exists "admins manage members" on public.members;
create policy "admins manage members" on public.members
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage check_ins" on public.check_ins;
create policy "admins manage check_ins" on public.check_ins
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Convenience view: visit counts per member for current calendar month
-- ============================================================
create or replace view public.member_month_stats as
select
  m.id as member_id,
  m.name,
  m.subscription_renewed_at,
  m.subscription_expires_at,
  coalesce(c.visits_this_month, 0) as visits_this_month,
  c.last_visit_at
from public.members m
left join (
  select
    member_id,
    count(*) filter (where checked_in_at >= date_trunc('month', now())) as visits_this_month,
    max(checked_in_at) as last_visit_at
  from public.check_ins
  group by member_id
) c on c.member_id = m.id;

-- Grant select on the view to authenticated (RLS on underlying tables still applies)
grant select on public.member_month_stats to authenticated, anon;
