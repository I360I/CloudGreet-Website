-- Per-setter reward for hitting the weekly demo goal `streak_target` (4)
-- weeks straight. Previously a hardcoded $50 constant (BONUS_AMOUNT_USD in
-- lib/sales/dialer-stats.ts); now editable per setter in /admin/setters
-- (the GoalEditor next to the weekly goal). getWeeklyDemoGoalStatus reads
-- this so the streak payout shown to the setter matches what admin set.
alter table public.custom_users
  add column if not exists weekly_demo_bonus integer not null default 50;

update public.custom_users set weekly_demo_bonus = 50 where weekly_demo_bonus is null;
