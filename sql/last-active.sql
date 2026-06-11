-- Last-activity heartbeat for users (shown as "Active Xh ago" on the
-- admin sales rep view). Updated by requireAuth at most every 5 minutes
-- per user, so it reflects real API activity, not just logins.
alter table public.custom_users
  add column if not exists last_active_at timestamptz;

comment on column public.custom_users.last_active_at is
  'Touched (throttled) by lib/auth-middleware requireAuth on any authenticated API call.';
