-- Review-request automation. Sends one SMS per appointment after the
-- service window, asking the customer to leave a Google review.
-- Off by default per business; opt-in via the customization form or
-- dashboard settings. Consent is captured during the AI booking call
-- (book_appointment tool now accepts review_consent: bool) so we
-- never text someone who didn't say yes on the phone.

-- Per-business configuration
alter table public.businesses
  add column if not exists review_requests_enabled boolean default false,
  add column if not exists google_review_url text,
  add column if not exists review_sms_template text,
  -- Send-time preference. One of:
  --   '1h_after'           - 1 hour after the appointment start
  --   'evening_same_day'   - 6pm same day local
  --   'next_morning'       - 10am next morning local
  add column if not exists review_send_timing text default '1h_after';

-- Per-appointment queued review request. Cron worker picks up rows
-- where status='queued' and scheduled_for <= now(), sends, and flips
-- status to 'sent' (or 'failed' / 'skipped').
create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  customer_phone text not null,
  customer_name text,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'queued',  -- queued | sent | failed | skipped | canceled
  skip_reason text,                        -- 'opt_out' | 'frequency_cap' | 'no_consent' | 'no_review_url' | 'disabled'
  failure_reason text,
  telnyx_message_id text,
  rendered_message text,                   -- store the exact text we sent for audit
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists review_requests_due_idx
  on public.review_requests (status, scheduled_for)
  where status = 'queued';

create index if not exists review_requests_business_phone_idx
  on public.review_requests (business_id, customer_phone, sent_at);

create index if not exists review_requests_appointment_idx
  on public.review_requests (appointment_id);

-- Phone-level opt-outs. Global (not per-business): if a customer texts
-- STOP to the CloudGreet sender, we never message them again from any
-- of our clients. Required for TCPA / carrier compliance.
create table if not exists public.review_opt_outs (
  phone text primary key,
  opted_out_at timestamptz default now(),
  source text default 'stop_keyword'  -- 'stop_keyword' | 'help_keyword' | 'manual' | 'bounce'
);

-- Review-consent capture on appointments. Set true when the AI agent
-- explicitly asks "ok if we send a follow-up text?" and the caller
-- says yes. False/null means do not send.
alter table public.appointments
  add column if not exists review_consent boolean,
  add column if not exists review_consent_captured_at timestamptz;
