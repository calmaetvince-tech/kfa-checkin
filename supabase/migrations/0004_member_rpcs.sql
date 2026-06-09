-- 0004_member_rpcs.sql
-- Drift fix: the token-scoped member self-view RPCs. These are called from
-- app/m/[token]/page.tsx but were applied directly to the live DB (originally
-- via the ad-hoc "member_self_rpc" migration) and never committed. Idempotent
-- via create-or-replace.
--
-- NOTE: migration 0005 later extends these to also return gym_id + gym name
-- for multi-tenant support. This file documents the original (single-tenant)
-- definitions so a fresh `supabase db push` reproduces the historical state.

create or replace function public.get_member_by_token(p_token text)
returns table (
  id uuid,
  name text,
  qr_token text,
  subscription_renewed_at timestamptz,
  subscription_expires_at timestamptz,
  created_at timestamptz,
  visits_this_month bigint,
  visits_all_time bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.name,
    m.qr_token,
    m.subscription_renewed_at,
    m.subscription_expires_at,
    m.created_at,
    (select count(*) from public.check_ins c
       where c.member_id = m.id
       and c.checked_in_at >= date_trunc('month', now())) as visits_this_month,
    (select count(*) from public.check_ins c
       where c.member_id = m.id) as visits_all_time
  from public.members m
  where m.qr_token = p_token
  limit 1;
$$;

create or replace function public.get_member_visits(p_token text, p_limit int default 20)
returns table (
  id uuid,
  checked_in_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.checked_in_at
  from public.check_ins c
  join public.members m on m.id = c.member_id
  where m.qr_token = p_token
  order by c.checked_in_at desc
  limit p_limit;
$$;

grant execute on function public.get_member_by_token(text) to anon, authenticated;
grant execute on function public.get_member_visits(text, int) to anon, authenticated;
