-- 0003_member_extra_columns.sql
-- Drift fix: extra member profile columns that were applied directly to the
-- live DB (originally via the ad-hoc "member_details_v2" migration) but never
-- captured in a committed migration file. Idempotent.

alter table public.members
  add column if not exists date_of_birth date,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists plan text,
  add column if not exists discipline text;

-- The dashboard list view gained a `plan` column. Recreate to match live.
-- (drop first: create-or-replace cannot add a column in the middle of a view)
drop view if exists public.member_month_stats;

create view public.member_month_stats as
select
  m.id as member_id,
  m.name,
  m.plan,
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

grant select on public.member_month_stats to authenticated, anon;
