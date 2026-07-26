-- Rep-editable dial goal (weekly_demo_goal already exists).
-- Applied 2026-07-26 via MCP apply_migration (rep_daily_dial_goal).
alter table public.custom_users
  add column if not exists daily_dial_goal integer;
