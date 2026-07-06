-- 0017_class_schedule.sql
-- Weekly class schedule, editable by the gym owner, visible to members via a
-- token-scoped RPC. dow: 0=Monday .. 6=Sunday (gym convention).

create table if not exists public.class_schedule (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  dow int not null check (dow between 0 and 6),
  start_time text not null, -- 'HH:MM' 24h, gym local time
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists class_schedule_gym_idx on public.class_schedule(gym_id, dow, start_time);

alter table public.class_schedule enable row level security;

drop policy if exists "admins manage schedule" on public.class_schedule;
create policy "admins manage schedule" on public.class_schedule
  for all
  using (public.is_admin() and gym_id = public.current_gym_id())
  with check (public.is_admin() and gym_id = public.current_gym_id());

-- Members read their gym's schedule with their token.
create or replace function public.get_gym_schedule(p_token text)
returns table (id uuid, dow int, start_time text, title text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.dow, s.start_time, s.title
  from public.class_schedule s
  join public.members m on m.gym_id = s.gym_id
  where m.qr_token = p_token
  order by s.dow, s.start_time;
$$;

grant execute on function public.get_gym_schedule(text) to anon, authenticated;
