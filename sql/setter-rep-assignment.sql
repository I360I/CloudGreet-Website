-- Setter -> closing-rep assignment + demo attribution.
-- Applied 2026-07-04 via Supabase MCP (migration: setter_rep_assignment).
--
-- assigned_rep_id: which sales rep a setter's booked demos flow to. When a
-- setter marks a demo, the closes row is created under this rep's id so the
-- demo shows up in the rep's /sales pipeline like one they set themselves.
-- set_by_setter_id: attribution on closes for who originated the demo
-- (setter weekly-goal / bonus tracking without touching commission math).
alter table public.custom_users
  add column if not exists assigned_rep_id uuid references public.custom_users(id);

alter table public.closes
  add column if not exists set_by_setter_id uuid references public.custom_users(id);

create index if not exists idx_closes_set_by_setter
  on public.closes(set_by_setter_id) where set_by_setter_id is not null;
