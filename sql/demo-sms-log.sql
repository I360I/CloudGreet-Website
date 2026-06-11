-- Rate-limit ledger for the real "(Demo SMS)" texts the landing-page
-- demo agents send so prospects can see the booking confirmation flow.
create table if not exists public.demo_sms_log (
  id uuid primary key default gen_random_uuid(),
  phone_digits text not null,
  agent_id text,
  vertical text,
  created_at timestamptz not null default now()
);
create index if not exists idx_demo_sms_log_phone_time on public.demo_sms_log (phone_digits, created_at desc);
create index if not exists idx_demo_sms_log_time on public.demo_sms_log (created_at desc);
comment on table public.demo_sms_log is 'Rate-limit ledger for real (Demo SMS) texts sent by the landing-page demo agents.';
