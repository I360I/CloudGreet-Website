-- Leads pipeline. Run once in Supabase SQL editor.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  phone text,
  email text,
  source text not null default 'cold_call',
  status text not null default 'cold',
  notes text,
  last_contacted_at timestamptz,
  next_action_at timestamptz,
  assigned_business_id uuid references public.businesses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_next_action_idx on public.leads (next_action_at);
create index if not exists leads_created_idx on public.leads (created_at desc);
