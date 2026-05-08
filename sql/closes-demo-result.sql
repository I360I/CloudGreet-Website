-- ============================================================
-- closes.demo_result - rep records what happened on the demo
-- ============================================================
-- Lifecycle: rep books a demo (demo_scheduled_at set) → demo date
-- arrives → rep marks the result here. Drives the closes-page row
-- pill so the lifecycle keeps progressing visibly post-demo.
--
-- Values:
--   pending          - default, demo hasn't happened yet
--   won              - prospect agreed, payment incoming/done
--   lost             - prospect said no
--   no_show          - prospect didn't dial in
--   needs_followup   - going well, scheduled another call
--   reschedule       - prospect bailed, new slot pending
--   ghosted          - dropped off after demo, no response
-- ============================================================

alter table closes
  add column if not exists demo_result text not null default 'pending'
    check (demo_result in (
      'pending','won','lost','no_show','needs_followup','reschedule','ghosted'
    )),
  add column if not exists demo_result_at  timestamptz,
  add column if not exists demo_result_notes text;

create index if not exists closes_demo_result_idx on closes (demo_result);
