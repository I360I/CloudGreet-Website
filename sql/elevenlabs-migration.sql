-- ElevenLabs migration: schema additions
--
-- Adds columns to track ElevenLabs agents + phone numbers alongside
-- the existing retell_* columns. We DON'T drop retell_* yet - keep
-- both during the migration so we can roll back if needed. Final
-- pass after verification deletes the retell columns.
--
-- Safe to run multiple times (every statement uses IF NOT EXISTS or
-- equivalent).

-- 1. Per-business agent + phone mapping.
alter table public.businesses
  add column if not exists elevenlabs_agent_id text,
  add column if not exists elevenlabs_phone_number_id text,
  add column if not exists elevenlabs_voice_id text,
  add column if not exists elevenlabs_voice_speed numeric(3,2),
  add column if not exists elevenlabs_voice_stability numeric(3,2),
  add column if not exists elevenlabs_voice_similarity_boost numeric(3,2),
  add column if not exists elevenlabs_first_message text,
  add column if not exists elevenlabs_provisioned_at timestamptz;

create index if not exists businesses_elevenlabs_agent_idx
  on public.businesses (elevenlabs_agent_id)
  where elevenlabs_agent_id is not null;

-- 2. Demo agents on closes (admin builds these before the rep's demo).
alter table public.closes
  add column if not exists elevenlabs_agent_id text,
  add column if not exists elevenlabs_phone_number_id text,
  add column if not exists elevenlabs_test_phone text;

-- 3. Calls/conversations - track which provider each call came from
--    so we can correlate during the migration window.
alter table public.calls
  add column if not exists elevenlabs_conversation_id text,
  add column if not exists provider text default 'retell';

create index if not exists calls_elevenlabs_conversation_idx
  on public.calls (elevenlabs_conversation_id)
  where elevenlabs_conversation_id is not null;

-- 4. Phone numbers table: add EL identifier.
alter table public.phone_numbers
  add column if not exists elevenlabs_phone_number_id text;

-- 5. ai_agents (legacy) - mark which provider each row belongs to so
--    the dashboard's "current agent" lookup can prefer EL when present.
alter table public.ai_agents
  add column if not exists elevenlabs_agent_id text,
  add column if not exists provider text default 'retell';

-- After full migration + verification, run sql/elevenlabs-cleanup.sql
-- to drop retell_* columns.
