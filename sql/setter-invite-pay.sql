-- Optional pre-set pay/goal on a pending setter invite. When the admin sets
-- these, app/api/setter/accept-invite copies them onto the setter's account
-- at creation time; null falls through to the custom_users defaults
-- (weekly_demo_goal 2, base/bonus hourly rate 0).
alter table public.setter_invites
  add column if not exists weekly_demo_goal   integer      null,
  add column if not exists base_hourly_rate   numeric(6,2) null,
  add column if not exists bonus_hourly_rate  numeric(6,2) null;
