-- 0014_member_photos.sql
-- Member profile photos. Stored as a compact base64 data-URI on the member row
-- (client compresses to ~256px JPEG ≈ 10-30KB, hard-capped here). Upload is
-- authorized by holding the member's secret qr_token — same model as the rest
-- of the member self-view. Lists fetch photos via /api/avatar/[id] (cached),
-- backed by get_member_photo. Idempotent.

alter table public.members
  add column if not exists photo text,
  add column if not exists photo_updated_at timestamptz;

-- Member sets (or clears) their own photo, proving ownership via token.
create or replace function public.set_member_photo(p_token text, p_photo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_photo is not null
     and (length(p_photo) > 400000 or p_photo not like 'data:image/%') then
    raise exception 'invalid photo';
  end if;
  update public.members
     set photo = p_photo,
         photo_updated_at = case when p_photo is null then null else now() end
   where qr_token = p_token;
  return found;
end;
$$;

grant execute on function public.set_member_photo(text, text) to anon, authenticated;

-- Photo lookup by member id (uuid = unguessable) for the cached avatar route.
create or replace function public.get_member_photo(p_member_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select photo from public.members where id = p_member_id;
$$;

grant execute on function public.get_member_photo(uuid) to anon, authenticated;

-- Surface photo on the member self-view RPC (return-type change → drop first).
drop function if exists public.get_member_by_token(text);

create or replace function public.get_member_by_token(p_token text)
returns table (
  id uuid, name text, qr_token text,
  subscription_renewed_at timestamptz, subscription_expires_at timestamptz,
  created_at timestamptz, visits_this_month bigint, visits_all_time bigint,
  gym_id uuid, gym_name text, date_of_birth date, language text,
  photo text, photo_updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select m.id, m.name, m.qr_token,
    m.subscription_renewed_at, m.subscription_expires_at, m.created_at,
    (select count(*) from public.check_ins c
       where c.member_id = m.id
       and c.checked_in_at >= timezone('Europe/Athens', date_trunc('month', timezone('Europe/Athens', now())))),
    (select count(*) from public.check_ins c where c.member_id = m.id),
    m.gym_id, g.name, m.date_of_birth, m.language,
    m.photo, m.photo_updated_at
  from public.members m
  left join public.gyms g on g.id = m.gym_id
  where m.qr_token = p_token
  limit 1;
$$;

grant execute on function public.get_member_by_token(text) to anon, authenticated;

-- Surface photo version on the owner overview (for cache-busted <img> URLs).
drop function if exists public.get_members_overview();

create or replace function public.get_members_overview()
returns table (
  member_id uuid, name text, phone text, plan text,
  subscription_renewed_at timestamptz, subscription_expires_at timestamptz,
  visits_this_month bigint, total_visits bigint, last_visit_at timestamptz,
  current_streak int, photo_updated_at timestamptz
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
    coalesce(cur.current_streak,0)::int, m.photo_updated_at
  from public.members m
  left join agg a on a.member_id = m.id
  left join cur on cur.member_id = m.id
  where m.gym_id = (select g from gid)
  order by m.name;
$$;

grant execute on function public.get_members_overview() to authenticated;
