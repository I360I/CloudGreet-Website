-- dispatch_notifications: delivery tracking + auto-retry for owner dispatch
-- texts ("Steve, call this customer back"). A Telnyx 200 only means the
-- message was accepted, not delivered - so we record each send with its
-- Telnyx message id, watch the delivery receipt (message.finalized) on the
-- SMS webhook, and resend on a failed status (up to 3 attempts, then alert
-- admin). The dispatch safety net covers "never attempted"; this covers
-- "attempted but didn't land".
--
-- Idempotent: safe to re-run.

create table if not exists public.dispatch_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  retell_call_id text,
  recipient_phone text not null,
  from_number text,
  body text,
  telnyx_message_id text,
  status text not null default 'sent',   -- sent | delivered | delivery_failed | exhausted
  attempts int not null default 1,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dispatch_notifications_msgid_idx
  on public.dispatch_notifications (telnyx_message_id);
create index if not exists dispatch_notifications_business_idx
  on public.dispatch_notifications (business_id, created_at desc);
