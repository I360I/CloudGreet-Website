-- Applied 2026-07-06 via Supabase MCP (migration: call_scripts_library).
--
-- Full-length call scripts library (whole call flows a rep/setter can
-- read, edit, upload). Separate from dialer_scripts, which holds the
-- short section snippets the cockpit right-rail renders in-call.
create table if not exists public.call_scripts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references public.custom_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_call_scripts_updated
  on public.call_scripts(updated_at desc);

-- 2026-07-06 (migration: call_scripts_primary): one script can be
-- marked primary - it's what the cockpit's in-call Script rail renders.
alter table public.call_scripts
  add column if not exists is_primary boolean not null default false;

create unique index if not exists idx_call_scripts_one_primary
  on public.call_scripts(is_primary) where is_primary;
