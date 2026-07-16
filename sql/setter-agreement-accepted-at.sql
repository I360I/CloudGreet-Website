-- One-time in-app agreement confirm for commission setters. The setter
-- shell flashes a confirm screen while agreement_accepted_at is null and
-- POST /api/setter/accept-agreement stamps it. Applied live 2026-07-15.
alter table public.custom_users
  add column if not exists agreement_accepted_at timestamptz;

comment on column public.custom_users.agreement_accepted_at is
  'When a setter confirmed the in-app commission agreement. Null for a setter = they must confirm it on next login before using the app.';

-- Existing setters have different / hourly arrangements; they were marked
-- accepted at rollout so only new commission setters get prompted:
--   update custom_users set agreement_accepted_at = now()
--   where role='setter' and agreement_accepted_at is null and id <> '<carlos>';
