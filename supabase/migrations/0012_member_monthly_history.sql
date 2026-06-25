-- 0012_member_monthly_history.sql
-- Per-month workout history for a member (Athens months). The "current month"
-- count resets naturally on the 1st because it's derived from check_ins — no
-- data is ever deleted. Idempotent.

create or replace function public.get_member_monthly(p_token text, p_months int default 6)
returns table (month_start date, visits bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (date_trunc('month', c.checked_in_at at time zone 'Europe/Athens'))::date as month_start,
    count(*)::bigint as visits
  from public.check_ins c
  join public.members m on m.id = c.member_id
  where m.qr_token = p_token
  group by 1
  order by 1 desc
  limit greatest(p_months, 1);
$$;

grant execute on function public.get_member_monthly(text, int) to anon, authenticated;
