-- ============================================================
-- Rep call log
-- ============================================================
-- Every outbound call placed via the in-browser dialer creates a row
-- here. Used for:
--   · Touch tracking on the lead (call counts as a touch)
--   · Daily call-volume metrics in the rep dashboard
--   · Dispute resolution if a rep claims a lead was called and the
--     status sticks at "no answer"
--
-- Idempotent.
-- ============================================================

create table if not exists public.rep_calls (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.custom_users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  to_number text not null,
  from_number text,
  -- 'ringing' | 'active' | 'completed' | 'no_answer' | 'busy' | 'failed' | 'rejected'
  status text not null default 'ringing',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  telnyx_call_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists rep_calls_rep_started_idx
  on public.rep_calls (rep_id, started_at desc);
create index if not exists rep_calls_lead_idx
  on public.rep_calls (lead_id) where lead_id is not null;
