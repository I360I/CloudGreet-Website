-- Public-facing applications for the commission-only sales rep role.
-- Linked from the job posting. Anthony reviews via /admin/applications.

create table if not exists public.rep_applications (
  id uuid primary key default gen_random_uuid(),

  -- Identity
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  city text,
  state text,
  linkedin_url text,

  -- Experience
  years_sales_experience integer,
  previous_role text,
  industries_sold text,
  biggest_deal_cents integer,
  prior_commission_only boolean,
  prior_b2b boolean,

  -- Why
  why_commission_only text,
  why_cloudgreet text,

  -- Goals
  monthly_goal_deals integer,
  why_can_hit_goal text,

  -- Availability + setup
  earliest_start_date date,
  hours_per_week integer,
  has_workspace boolean,

  -- Submissions — one of resume_url / video_url required (enforced in API)
  resume_url text,
  video_url text,

  -- Funnel state
  status text not null default 'new' check (status in (
    'new','reviewing','interview_scheduled','offered','hired','rejected','withdrawn'
  )),
  admin_notes text,
  reviewed_by uuid references public.custom_users(id) on delete set null,
  reviewed_at timestamptz,

  -- Light forensics for spam triage
  ip_address text,
  user_agent text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rep_applications_status_idx on public.rep_applications (status);
create index if not exists rep_applications_created_idx on public.rep_applications (created_at desc);
create unique index if not exists rep_applications_email_active_idx
  on public.rep_applications (lower(email))
  where status not in ('rejected','withdrawn');
