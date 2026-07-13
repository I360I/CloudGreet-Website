-- Per-setter hourly pay with a demo-goal bump.
-- Setters are paid base_hourly_rate normally, and bumped to
-- bonus_hourly_rate for any week they hold >= weekly_demo_goal demos
-- (no streak - each week stands on its own). getWeeklyDemoGoalStatus
-- (lib/sales/dialer-stats.ts) reads both to report the rate that applies
-- this week; admin edits them in /admin/setters next to the weekly goal.
alter table public.custom_users
  add column if not exists base_hourly_rate  numeric(6,2) not null default 0,
  add column if not exists bonus_hourly_rate numeric(6,2) not null default 0;

-- Supersedes the short-lived flat weekly_demo_bonus column (same-session
-- iteration) - drop it so the pay model is unambiguous.
alter table public.custom_users drop column if exists weekly_demo_bonus;
