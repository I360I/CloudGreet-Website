-- Missing tables flagged in the pre-launch schema audit.
--
-- Each block is idempotent (`if not exists`) so this is safe to re-run.
-- Tables here are not on the customer booking path, but admin views and
-- background jobs query them, so absence shows up as red banners or
-- silent insert failures.

-- 1) business_knowledge_entries
create table if not exists public.business_knowledge_entries (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title       text not null,
  content     text not null,
  tags        jsonb,
  created_by  uuid references public.custom_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists business_knowledge_entries_business_updated_idx
  on public.business_knowledge_entries (business_id, updated_at desc);

-- 2) email_logs
create table if not exists public.email_logs (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  to_email    text,
  from_email  text,
  subject     text,
  body        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists email_logs_business_created_idx
  on public.email_logs (business_id, created_at desc);

-- 3) integration_secret_values
create table if not exists public.integration_secret_values (
  slug             text not null,
  field_key        text not null,
  value_encrypted  text,
  status           text,
  metadata         jsonb,
  last_verified_at timestamptz,
  updated_at       timestamptz default now(),
  primary key (slug, field_key)
);

-- 4) outreach_templates (must come before outreach_steps - FK target)
create table if not exists public.outreach_templates (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid references public.businesses(id) on delete cascade,
  created_by         uuid references public.custom_users(id) on delete set null,
  name               text not null,
  channel            text not null,
  subject            text,
  body               text not null,
  compliance_footer  text,
  is_active          boolean not null default true,
  is_default         boolean not null default false,
  metadata           jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists outreach_templates_business_updated_idx
  on public.outreach_templates (business_id, updated_at desc);

-- 5) outreach_steps
create table if not exists public.outreach_steps (
  id                 uuid primary key default gen_random_uuid(),
  sequence_id        uuid not null,
  step_order         integer not null,
  channel            text not null,
  wait_minutes       integer not null default 0,
  template_id        uuid references public.outreach_templates(id) on delete set null,
  fallback_channel   text,
  send_window_start  text,
  send_window_end    text,
  metadata           jsonb
);
create index if not exists outreach_steps_sequence_order_idx
  on public.outreach_steps (sequence_id, step_order);

-- 6) outreach_events
create table if not exists public.outreach_events (
  id           uuid primary key default gen_random_uuid(),
  sequence_id  uuid not null,
  prospect_id  uuid,
  step_id      uuid references public.outreach_steps(id) on delete set null,
  channel      text not null,
  status       text not null,
  message_id   text,
  scheduled_at timestamptz,
  sent_at      timestamptz,
  replied_at   timestamptz,
  error        text,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists outreach_events_sequence_created_idx
  on public.outreach_events (sequence_id, created_at desc);
create index if not exists outreach_events_prospect_created_idx
  on public.outreach_events (prospect_id, created_at desc);
create index if not exists outreach_events_sequence_status_idx
  on public.outreach_events (sequence_id, status);

notify pgrst, 'reload schema';
