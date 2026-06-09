-- 0007_member_month_stats_phone.sql
-- Expose member phone on the dashboard stats view so the "Renewals due" list
-- can build one-tap WhatsApp reminder links. Idempotent (drop + recreate).

drop view if exists public.member_month_stats;

create view public.member_month_stats as
select
  m.id as member_id,
  m.name,
  m.phone,
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
