-- 0010_members_overview_rpc.sql
-- One-shot per-member overview for the owner dashboard list: subscription,
-- visit counts, last visit, and current streak — all computed server-side,
-- gym-scoped to the calling admin. Idempotent.

create or replace function public.get_members_overview()
returns table (
  member_id uuid,
  name text,
  phone text,
  plan text,
  subscription_renewed_at timestamptz,
  subscription_expires_at timestamptz,
  visits_this_month bigint,
  total_visits bigint,
  last_visit_at timestamptz,
  current_streak int
)
language sql
stable
security definer
set search_path = public
as $$
  with gid as (select public.current_gym_id() as g),
  days as (
    select c.member_id, (c.checked_in_at at time zone 'Europe/Athens')::date as d
    from public.check_ins c
    join public.members m on m.id = c.member_id
    where m.gym_id = (select g from gid)
    group by c.member_id, (c.checked_in_at at time zone 'Europe/Athens')::date
  ),
  ranked as (
    select member_id, d,
      d - (row_number() over (partition by member_id order by d))::int as island
    from days
  ),
  runs as (
    select member_id, count(*) as len, max(d) as end_d
    from ranked
    group by member_id, island
  ),
  cur as (
    select member_id, current_streak from (
      select member_id, len as current_streak, end_d,
        row_number() over (partition by member_id order by end_d desc) as rn
      from runs
      where end_d >= ((now() at time zone 'Europe/Athens')::date - 1)
    ) x where rn = 1
  ),
  agg as (
    select c.member_id,
      count(*) as total_visits,
      count(*) filter (where c.checked_in_at >= date_trunc('month', now())) as visits_this_month,
      max(c.checked_in_at) as last_visit_at
    from public.check_ins c
    join public.members m on m.id = c.member_id
    where m.gym_id = (select g from gid)
    group by c.member_id
  )
  select
    m.id, m.name, m.phone, m.plan,
    m.subscription_renewed_at, m.subscription_expires_at,
    coalesce(a.visits_this_month, 0),
    coalesce(a.total_visits, 0),
    a.last_visit_at,
    coalesce(cur.current_streak, 0)::int
  from public.members m
  left join agg a on a.member_id = m.id
  left join cur on cur.member_id = m.id
  where m.gym_id = (select g from gid)
  order by m.name;
$$;

grant execute on function public.get_members_overview() to authenticated;
