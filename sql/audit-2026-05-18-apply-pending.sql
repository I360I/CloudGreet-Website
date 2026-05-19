-- ============================================================
-- Apply outstanding pending migration found by 2026-05-18 audit.
-- ============================================================
-- Re-runs the existing closes-demo-result migration which was
-- never applied. Idempotent — safe to run.

alter table closes
  add column if not exists demo_result text not null default 'pending'
    check (demo_result in (
      'pending','won','lost','no_show','needs_followup','reschedule','ghosted'
    )),
  add column if not exists demo_result_at  timestamptz,
  add column if not exists demo_result_notes text;

create index if not exists closes_demo_result_idx on closes (demo_result);
