-- Applied 2026-07-07 via Supabase MCP (migration: rep_call_recording).
-- Owner-only auto call recording, gated to one-party consent states
-- (see lib/compliance/call-recording.ts).
alter table public.rep_calls
  add column if not exists recording_url text,
  add column if not exists recording_state text,
  add column if not exists recording_status text;
insert into storage.buckets (id, name, public)
values ('call-recordings', 'call-recordings', false)
on conflict (id) do nothing;

-- (2026-07-07) AI owner-name verification confidence/provenance.
alter table public.leads
  add column if not exists owner_confidence text,
  add column if not exists owner_source text,
  add column if not exists owner_verified_at timestamptz;
