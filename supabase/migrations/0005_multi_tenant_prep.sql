-- 0005_multi_tenant_prep.sql
-- Multi-tenant foundation. Prepares the schema for many gyms without changing
-- single-tenant behaviour: every existing row is backfilled to the Kallistis
-- gym, so all current queries keep returning the same data. Fully idempotent.

-- 1. gyms ---------------------------------------------------------------------
create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now(),
  subscription_status text not null default 'active',
  subscription_expires_at timestamptz
);

-- 2. gym_id columns (nullable first so backfill can run) -----------------------
alter table public.members add column if not exists gym_id uuid;
alter table public.admins  add column if not exists gym_id uuid;

-- 3. backfill: seed the first gym and point every existing row at it -----------
insert into public.gyms (name, slug)
values ('Kallistis Fight Academy', 'kallistis')
on conflict (slug) do nothing;

update public.members m
  set gym_id = g.id
  from public.gyms g
  where g.slug = 'kallistis' and m.gym_id is null;

update public.admins a
  set gym_id = g.id
  from public.gyms g
  where g.slug = 'kallistis' and a.gym_id is null;

-- 4. enforce NOT NULL now that every row has a gym ----------------------------
alter table public.members alter column gym_id set not null;
alter table public.admins  alter column gym_id set not null;

-- 5. foreign keys + indexes (guarded for idempotency) -------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'members_gym_id_fkey') then
    alter table public.members
      add constraint members_gym_id_fkey
      foreign key (gym_id) references public.gyms(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admins_gym_id_fkey') then
    alter table public.admins
      add constraint admins_gym_id_fkey
      foreign key (gym_id) references public.gyms(id) on delete cascade;
  end if;
end $$;

create index if not exists members_gym_id_idx on public.members(gym_id);
create index if not exists admins_gym_id_idx on public.admins(gym_id);

-- 6. gym-scope helper ---------------------------------------------------------
-- is_admin() stays boolean (it is referenced by existing policies and reads
-- cleanly). We add a companion that returns the calling admin's gym so RLS can
-- scope rows per tenant. SECURITY DEFINER so it can read the admins table.
create or replace function public.current_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id from public.admins where user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_gym_id() to authenticated;

-- 6b. auto-assign gym on member insert ----------------------------------------
-- gym_id is NOT NULL; this trigger fills it from the calling admin's gym when
-- the insert omits it, so existing app code keeps working.
create or replace function public.set_member_gym_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.gym_id is null then
    new.gym_id := public.current_gym_id();
  end if;
  return new;
end;
$$;

drop trigger if exists members_set_gym_id on public.members;
create trigger members_set_gym_id
  before insert on public.members
  for each row execute function public.set_member_gym_id();

-- 7. gym-scoped RLS -----------------------------------------------------------
-- members: an admin manages only members of their own gym.
drop policy if exists "admins manage members" on public.members;
create policy "admins manage members" on public.members
  for all
  using (public.is_admin() and gym_id = public.current_gym_id())
  with check (public.is_admin() and gym_id = public.current_gym_id());

-- check_ins has no gym_id; scope it through the owning member's gym.
drop policy if exists "admins manage check_ins" on public.check_ins;
create policy "admins manage check_ins" on public.check_ins
  for all
  using (
    public.is_admin()
    and member_id in (
      select id from public.members where gym_id = public.current_gym_id()
    )
  )
  with check (
    public.is_admin()
    and member_id in (
      select id from public.members where gym_id = public.current_gym_id()
    )
  );

-- gyms: admins can read their own gym row.
alter table public.gyms enable row level security;
drop policy if exists "admins read own gym" on public.gyms;
create policy "admins read own gym" on public.gyms
  for select using (id = public.current_gym_id());

-- 8. RPCs gain gym_id + gym name (supersede 0004 definitions) ------------------
-- Adding columns changes the return type, so the old definitions must be
-- dropped first (create-or-replace cannot alter a function's OUT columns).
drop function if exists public.get_member_by_token(text);
drop function if exists public.get_member_visits(text, int);

create or replace function public.get_member_by_token(p_token text)
returns table (
  id uuid,
  name text,
  qr_token text,
  subscription_renewed_at timestamptz,
  subscription_expires_at timestamptz,
  created_at timestamptz,
  visits_this_month bigint,
  visits_all_time bigint,
  gym_id uuid,
  gym_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.name,
    m.qr_token,
    m.subscription_renewed_at,
    m.subscription_expires_at,
    m.created_at,
    (select count(*) from public.check_ins c
       where c.member_id = m.id
       and c.checked_in_at >= date_trunc('month', now())) as visits_this_month,
    (select count(*) from public.check_ins c
       where c.member_id = m.id) as visits_all_time,
    m.gym_id,
    g.name as gym_name
  from public.members m
  left join public.gyms g on g.id = m.gym_id
  where m.qr_token = p_token
  limit 1;
$$;

create or replace function public.get_member_visits(p_token text, p_limit int default 20)
returns table (
  id uuid,
  checked_in_at timestamptz,
  gym_id uuid,
  gym_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.checked_in_at, m.gym_id, g.name as gym_name
  from public.check_ins c
  join public.members m on m.id = c.member_id
  left join public.gyms g on g.id = m.gym_id
  where m.qr_token = p_token
  order by c.checked_in_at desc
  limit p_limit;
$$;

grant execute on function public.get_member_by_token(text) to anon, authenticated;
grant execute on function public.get_member_visits(text, int) to anon, authenticated;
