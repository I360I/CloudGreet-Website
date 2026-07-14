-- Landing-page demo agent calls now store the transcript + recording the
-- same way client calls do, so the admin Calls > Demos tab can show them.
-- Populated by app/api/retell/call-events (demo upsert) on call_analyzed;
-- surfaced by /api/admin/calls?scope=demo.
alter table public.demo_agent_calls
  add column if not exists transcript    text null,
  add column if not exists recording_url text null;
