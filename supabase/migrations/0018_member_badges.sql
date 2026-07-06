-- 0018_member_badges.sql
-- One-off achievements computed from the full check-in history (Athens time),
-- token-scoped for the member page badge wall.

create or replace function public.get_member_badges(p_token text)
returns table (badge text)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select id from public.members where qr_token = p_token),
  ci as (
    select
      checked_in_at,
      (checked_in_at at time zone 'Europe/Athens') as local_ts,
      (checked_in_at at time zone 'Europe/Athens')::date as d
    from public.check_ins
    where member_id = (select id from me)
  ),
  days as (select distinct d from ci),
  ranked as (
    select d, d - (row_number() over (order by d))::int as island from days
  ),
  runs as (select count(*) as len from ranked group by island),
  monthly as (
    select count(*) as cnt from ci group by date_trunc('month', local_ts)
  )
  select b from (
    select 'first_blood' as b where exists (select 1 from ci)
    union all
    select 'early_bird' where exists (select 1 from ci where extract(hour from local_ts) < 8)
    union all
    select 'night_owl' where exists (select 1 from ci where extract(hour from local_ts) >= 21)
    union all
    select 'ten_month' where exists (select 1 from monthly where cnt >= 10)
    union all
    select 'week_streak' where exists (select 1 from runs where len >= 7)
    union all
    select 'fifty_club' where (select count(*) from ci) >= 50
  ) x;
$$;

grant execute on function public.get_member_badges(text) to anon, authenticated;
