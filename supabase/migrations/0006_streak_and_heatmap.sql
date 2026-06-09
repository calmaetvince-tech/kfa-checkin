-- 0006_streak_and_heatmap.sql
-- Retention features for the member self-view:
--   * get_member_streak  — current + longest consecutive training-day streaks
--   * get_member_active_days — distinct training days in the last N days (heatmap)
-- Days are bucketed in the gym's local timezone (Europe/Athens) so a late-night
-- session counts for the right calendar day. Idempotent.

create or replace function public.get_member_streak(p_member_id uuid)
returns table (current_streak_days int, longest_streak_days int)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select distinct (checked_in_at at time zone 'Europe/Athens')::date as d
    from public.check_ins
    where member_id = p_member_id
  ),
  -- gaps-and-islands: consecutive dates share a constant (d - row_number)
  grp as (
    select d, (d - (row_number() over (order by d))::int) as island
    from days
  ),
  runs as (
    select count(*) as len, max(d) as end_d
    from grp
    group by island
  )
  select
    coalesce((
      -- the current streak is the run whose latest day is today or yesterday
      select len::int from runs
      where end_d >= ((now() at time zone 'Europe/Athens')::date - 1)
      order by end_d desc
      limit 1
    ), 0) as current_streak_days,
    coalesce((select max(len)::int from runs), 0) as longest_streak_days;
$$;

create or replace function public.get_member_active_days(p_token text, p_days int default 30)
returns table (active_day date)
language sql
stable
security definer
set search_path = public
as $$
  select distinct (c.checked_in_at at time zone 'Europe/Athens')::date as active_day
  from public.check_ins c
  join public.members m on m.id = c.member_id
  where m.qr_token = p_token
    and c.checked_in_at >= (now() - (p_days || ' days')::interval)
  order by active_day;
$$;

grant execute on function public.get_member_streak(uuid) to anon, authenticated;
grant execute on function public.get_member_active_days(text, int) to anon, authenticated;
