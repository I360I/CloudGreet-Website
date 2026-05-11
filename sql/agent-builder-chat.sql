-- Storage for the agent-builder chat feature.
--
-- 1) cloudgreet_system_config: a tiny key/value table for runtime
--    config that should survive a redeploy. Used here to cache the
--    Anthropic agent_id + environment_id once provisioned so we don't
--    create new ones on every cold start.
-- 2) closes.agent_chat_session_id: link the prompt-generator chat
--    session for each close so re-opening the panel resumes the
--    same conversation.

create table if not exists public.cloudgreet_system_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.closes
  add column if not exists agent_chat_session_id text;

notify pgrst, 'reload schema';
