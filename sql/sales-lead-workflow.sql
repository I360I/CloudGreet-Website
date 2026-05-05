-- ============================================================
-- Lead workflow upgrade for the rep portal:
--   · per-rep status + disposition on lead_assignments
--   · follow-up scheduling
--   · touch tracking (count + last-touched-at)
--   · per-lead, per-rep notes (timestamped log)
-- All idempotent - safe to re-run.
-- ============================================================

alter table public.lead_assignments
  add column if not exists status text not null default 'new'
    check (status in (
      'new','called','voicemail','interested','demo_scheduled',
      'proposal_sent','closed','dead','do_not_call'
    )),
  add column if not exists disposition text,
  add column if not exists follow_up_at timestamptz,
  add column if not exists last_touched_at timestamptz,
  add column if not exists touch_count integer not null default 0;

create index if not exists lead_assignments_followup_idx
  on public.lead_assignments (rep_id, follow_up_at)
  where follow_up_at is not null;

create index if not exists lead_assignments_status_idx
  on public.lead_assignments (rep_id, status);

create index if not exists lead_assignments_touched_idx
  on public.lead_assignments (rep_id, last_touched_at desc nulls last);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  rep_id uuid not null references public.custom_users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_rep_idx
  on public.lead_notes (lead_id, rep_id, created_at desc);
