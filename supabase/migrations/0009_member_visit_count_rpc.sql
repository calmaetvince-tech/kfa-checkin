-- 0009_member_visit_count_rpc.sql
-- Lightweight token-scoped visit counter so the member's open QR page can poll
-- cheaply and detect when a check-in just happened (to fire the celebration).
-- Idempotent.

create or replace function public.get_member_visit_count(p_token text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.check_ins c
  join public.members m on m.id = c.member_id
  where m.qr_token = p_token;
$$;

grant execute on function public.get_member_visit_count(text) to anon, authenticated;
