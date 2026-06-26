-- email_campaigns: one row per campaign
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  from_name text not null default 'CloudGreet',
  from_email text not null,
  reply_to text,
  subject text not null,
  body_template text not null,
  status text not null default 'draft', -- draft | sending | paused | complete
  created_by text,
  sent_count int not null default 0,
  bounce_count int not null default 0,
  reply_count int not null default 0
);

-- email_leads: one row per recipient per campaign
create table if not exists public.email_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  email text not null,
  owner_name text,
  business_name text,
  city text,
  phone text,
  source text not null default 'manual', -- manual | scraper | csv
  status text not null default 'queued', -- queued | sending | sent | bounced | replied | unsubscribed
  sent_at timestamptz,
  resend_message_id text,
  personalized_subject text,
  personalized_body text,
  error text,
  unique(campaign_id, email)
);

create index if not exists email_leads_campaign_id_idx on public.email_leads(campaign_id);
create index if not exists email_leads_status_idx on public.email_leads(status);
