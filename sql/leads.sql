-- Leads pipeline. Idempotent - safe to run on a fresh DB or one that
-- already has a partial `leads` table from an earlier attempt.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  created_at timestamptz not null default now()
);

alter table public.leads
  add column if not exists contact_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists source text not null default 'cold_call',
  add column if not exists status text not null default 'cold',
  add column if not exists notes text,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists next_action_at timestamptz,
  add column if not exists assigned_business_id uuid references public.businesses(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_next_action_idx on public.leads (next_action_at);
create index if not exists leads_created_idx on public.leads (created_at desc);
