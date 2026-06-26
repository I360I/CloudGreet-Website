-- Add missing columns to email_leads for sequence and reply tracking
alter table public.email_leads
  add column if not exists replied_at timestamptz,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists sequence_step int not null default 0;

create index if not exists email_leads_next_follow_up_idx on public.email_leads(next_follow_up_at)
  where next_follow_up_at is not null;

-- Add signature to email_campaigns
alter table public.email_campaigns
  add column if not exists signature text;

-- campaign_sequences: follow-up steps per campaign
create table if not exists public.campaign_sequences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  step_number int not null,
  delay_days int not null default 3,
  subject_template text not null,
  body_template text not null,
  created_at timestamptz not null default now(),
  unique(campaign_id, step_number)
);
create index if not exists campaign_sequences_campaign_id_idx on public.campaign_sequences(campaign_id);

-- email_lead_replies: reply emails from prospects (via Brevo inbound)
create table if not exists public.email_lead_replies (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.email_leads(id) on delete cascade,
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  message_id text,
  in_reply_to text,
  from_email text not null,
  from_name text,
  subject text,
  body text,
  received_at timestamptz not null default now()
);
create index if not exists email_lead_replies_lead_id_idx on public.email_lead_replies(lead_id);
create index if not exists email_lead_replies_campaign_id_idx on public.email_lead_replies(campaign_id);
