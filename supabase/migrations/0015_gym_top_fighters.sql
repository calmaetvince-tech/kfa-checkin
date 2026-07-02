-- 0015_gym_top_fighters.sql
-- Member-facing leaderboard: top fighters of the member's own gym this month
-- (Athens month), authorized by the member's token. Exposes only name, photo
-- version and visit count — community info, like a leaderboard on the wall.

create or replace function public.get_gym_top_fighters(p_token text, p_limit int default 5)
returns table (
  member_id uuid,
  name text,
  photo_updated_at timestamptz,
  visits bigint,
  is_me boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id, gym_id from public.members where qr_token = p_token
  ),
  counts as (
    select c.member_id, count(*) as visits
    from public.check_ins c
    join public.members m on m.id = c.member_id
    where m.gym_id = (select gym_id from me)
      and c.checked_in_at >= timezone('Europe/Athens', date_trunc('month', timezone('Europe/Athens', now())))
    group by c.member_id
  )
  select m.id, m.name, m.photo_updated_at, ct.visits,
         m.id = (select id from me) as is_me
  from public.members m
  join counts ct on ct.member_id = m.id
  where m.gym_id = (select gym_id from me)
  order by ct.visits desc, m.name
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_gym_top_fighters(text, int) to anon, authenticated;
