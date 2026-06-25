-- 0011_athens_month_boundaries.sql
-- "Visits this month" was bucketed on the UTC month boundary. Switch both
-- member RPCs to the Rhodes/Athens month so counts match the gym's calendar.
-- Body-only change; signatures unchanged. Idempotent.

-- Athens month start, as a timestamptz instant:
--   timezone('Europe/Athens', date_trunc('month', timezone('Europe/Athens', now())))

create or replace function public.get_member_by_token(p_token text)
returns table (
  id uuid, name text, qr_token text,
  subscription_renewed_at timestamptz, subscription_expires_at timestamptz,
  created_at timestamptz, visits_this_month bigint, visits_all_time bigint,
  gym_id uuid, gym_name text, date_of_birth date, language text
)
language sql stable security definer set search_path = public
as $$
  select m.id, m.name, m.qr_token,
    m.subscription_renewed_at, m.subscription_expires_at, m.created_at,
    (select count(*) from public.check_ins c
       where c.member_id = m.id
       and c.checked_in_at >= timezone('Europe/Athens', date_trunc('month', timezone('Europe/Athens', now())))),
    (select count(*) from public.check_ins c where c.member_id = m.id),
    m.gym_id, g.name, m.date_of_birth, m.language
  from public.members m
  left join public.gyms g on g.id = m.gym_id
  where m.qr_token = p_token
  limit 1;
$$;

create or replace function public.get_members_overview()
returns table (
  member_id uuid, name text, phone text, plan text,
  subscription_renewed_at timestamptz, subscription_expires_at timestamptz,
  visits_this_month bigint, total_visits bigint, last_visit_at timestamptz,
  current_streak int
)
language sql stable security definer set search_path = public
as $$
  with gid as (select public.current_gym_id() as g),
  days as (
    select c.member_id, (c.checked_in_at at time zone 'Europe/Athens')::date as d
    from public.check_ins c join public.members m on m.id = c.member_id
    where m.gym_id = (select g from gid)
    group by c.member_id, (c.checked_in_at at time zone 'Europe/Athens')::date
  ),
  ranked as (
    select member_id, d, d - (row_number() over (partition by member_id order by d))::int as island
    from days
  ),
  runs as (select member_id, count(*) as len, max(d) as end_d from ranked group by member_id, island),
  cur as (
    select member_id, current_streak from (
      select member_id, len as current_streak, end_d,
        row_number() over (partition by member_id order by end_d desc) as rn
      from runs where end_d >= ((now() at time zone 'Europe/Athens')::date - 1)
    ) x where rn = 1
  ),
  agg as (
    select c.member_id, count(*) as total_visits,
      count(*) filter (where c.checked_in_at >= timezone('Europe/Athens', date_trunc('month', timezone('Europe/Athens', now())))) as visits_this_month,
      max(c.checked_in_at) as last_visit_at
    from public.check_ins c join public.members m on m.id = c.member_id
    where m.gym_id = (select g from gid)
    group by c.member_id
  )
  select m.id, m.name, m.phone, m.plan,
    m.subscription_renewed_at, m.subscription_expires_at,
    coalesce(a.visits_this_month,0), coalesce(a.total_visits,0), a.last_visit_at,
    coalesce(cur.current_streak,0)::int
  from public.members m
  left join agg a on a.member_id = m.id
  left join cur on cur.member_id = m.id
  where m.gym_id = (select g from gid)
  order by m.name;
$$;
