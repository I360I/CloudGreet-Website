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

  -- About
  about_yourself text,

  -- Why (optional)
  why_commission_only text,
  why_cloudgreet text,

  -- Goals
  monthly_goal_deals integer,
  why_can_hit_goal text,

  -- Availability + setup
  earliest_start_date date,
  hours_per_week integer,
  has_workspace boolean,

  -- Submissions. Files live in the 'applications' Storage bucket;
  -- resume_path / video_path are storage paths. resume_url / video_url
  -- are kept around for any legacy/manual entry. At least one of the
  -- four must be present (enforced in the API).
  resume_path text,
  resume_filename text,
  video_path text,
  video_filename text,
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

-- Storage bucket for resume PDFs and intro MP4s.
-- Private (no public reads); admin views with signed URLs from the
-- service-role key.
insert into storage.buckets (id, name, public)
values ('applications', 'applications', false)
on conflict (id) do nothing;

-- ALTER paths for environments where the table already exists from a
-- prior version of this migration.
alter table public.rep_applications add column if not exists about_yourself text;
alter table public.rep_applications add column if not exists resume_path text;
alter table public.rep_applications add column if not exists resume_filename text;
alter table public.rep_applications add column if not exists video_path text;
alter table public.rep_applications add column if not exists video_filename text;

