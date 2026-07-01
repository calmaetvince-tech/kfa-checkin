-- 0013_drop_leaky_stats_view.sql
-- SECURITY FIX: member_month_stats was a plain (owner-rights) view granted to
-- anon, so anyone with the public anon key could read member names/phones/
-- plans via /rest/v1/member_month_stats. The app no longer reads this view
-- (the dashboard uses the gym-scoped get_members_overview() RPC), so drop it.

drop view if exists public.member_month_stats;
