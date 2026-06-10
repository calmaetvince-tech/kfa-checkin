-- 0008_member_language_and_dob_in_rpc.sql
-- Adds a per-member language preference and surfaces language + date_of_birth
-- through get_member_by_token, so the member page can render a personalized
-- time-aware greeting without any extra query. Idempotent.

alter table public.members add column if not exists language text; -- 'el' | 'en' (null = default Greek)

-- Return-type change requires a drop first.
drop function if exists public.get_member_by_token(text);

create or replace function public.get_member_by_token(p_token text)
returns table (
  id uuid,
  name text,
  qr_token text,
  subscription_renewed_at timestamptz,
  subscription_expires_at timestamptz,
  created_at timestamptz,
  visits_this_month bigint,
  visits_all_time bigint,
  gym_id uuid,
  gym_name text,
  date_of_birth date,
  language text
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
       where c.member_id = m.id) as visits_all_time,
    m.gym_id,
    g.name as gym_name,
    m.date_of_birth,
    m.language
  from public.members m
  left join public.gyms g on g.id = m.gym_id
  where m.qr_token = p_token
  limit 1;
$$;

grant execute on function public.get_member_by_token(text) to anon, authenticated;
