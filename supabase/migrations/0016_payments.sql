-- 0016_payments.sql
-- Revenue tracking: one row per renewal payment, recorded when the owner marks
-- a renewal. Gym-scoped through the member, same RLS model as check_ins.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(8,2) not null check (amount >= 0),
  months int not null default 1,
  paid_at timestamptz not null default now(),
  note text
);

create index if not exists payments_member_idx on public.payments(member_id);
create index if not exists payments_paid_at_idx on public.payments(paid_at desc);

alter table public.payments enable row level security;

drop policy if exists "admins manage payments" on public.payments;
create policy "admins manage payments" on public.payments
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
