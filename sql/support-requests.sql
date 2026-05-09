-- Support requests from contractors
--
-- A contractor clicks "Support" in their dashboard sidebar and either
-- requests a detailed change (e.g., "tweak the agent prompt to mention
-- our 24/7 emergency line") or sends a general message. We persist
-- the request, ping Slack, and surface it in /admin/support-requests
-- so we triage promptly.

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid references public.custom_users(id) on delete set null,
  -- 'change_request' | 'message'
  kind text not null default 'message',
  subject text not null,
  body text not null,
  -- 'open' | 'in_progress' | 'resolved' | 'wontfix'
  status text not null default 'open' check (status in ('open','in_progress','resolved','wontfix')),
  /* Where we wrote in admin notes once we pick this up. */
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists support_requests_status_idx
  on public.support_requests (status, created_at desc);
create index if not exists support_requests_business_idx
  on public.support_requests (business_id, created_at desc);
