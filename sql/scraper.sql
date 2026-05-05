-- Lead scraper. Idempotent.
--
-- scrape_jobs   - one row per scrape execution. Tracks source, params,
--                 status, timing, and a top-level results_count snapshot.
-- scrape_results- one row per record discovered by a job. Stays in this
--                 staging table until the operator promotes selected
--                 records into public.leads.

create table if not exists public.scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  params jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  results_count integer not null default 0,
  promoted_count integer not null default 0,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scrape_jobs_status_idx on public.scrape_jobs (status);
create index if not exists scrape_jobs_created_idx on public.scrape_jobs (created_at desc);

create table if not exists public.scrape_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.scrape_jobs(id) on delete cascade,
  source text not null,
  business_name text,
  owner_name text,
  phone text,
  email text,
  business_type text,
  license_no text,
  address text,
  city text,
  state text,
  zip text,
  website text,
  raw jsonb not null default '{}'::jsonb,
  promoted_lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists scrape_results_job_idx on public.scrape_results (job_id);
create index if not exists scrape_results_phone_idx on public.scrape_results (phone);
