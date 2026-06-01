-- sms_conversations.report_token: an unguessable token for the login-free
-- "view full report" link texted to the admin. Each conversation gets a
-- stable random token; the public /r/[token] page renders that thread
-- read-only. pgcrypto (gen_random_bytes) is already enabled.
--
-- Idempotent: safe to re-run.

alter table public.sms_conversations add column if not exists report_token text;

update public.sms_conversations
  set report_token = encode(gen_random_bytes(16),'hex')
  where report_token is null;

alter table public.sms_conversations
  alter column report_token set default encode(gen_random_bytes(16),'hex');

create unique index if not exists sms_conversations_report_token_key
  on public.sms_conversations(report_token);
