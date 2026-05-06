-- ============================================================
-- Rep MRR decay - data model
-- ============================================================
-- Backs the "no-close decay" rule on the sales side:
--   · 0-89  days since last close  → 100% MRR commission
--   · 90-179 days                  → 25%
--   · 180+ days                    → clients revert to CloudGreet (0%)
-- Any close (not cancelled / rejected) resets the clock.
--
-- The tier itself is computed in the app (lib/sales/decay.ts) so the
-- formula stays in one place. The columns below are caches/audit so
-- queries don't have to scan the closes table every page load and so
-- the admin can see the snapshot at a glance.
--
-- Idempotent.
-- ============================================================

-- 1. Cache the rep's most recent qualifying close. Refreshed by the
--    same place that inserts into closes (and on close status change).
alter table sales_reps
  add column if not exists last_close_at timestamptz;

-- 2. Audit on each commission_ledger row: what tier was the rep in
--    when this commission was earned, and what multiplier should
--    apply. Population is deferred - we ship the UI first and turn
--    on the multiplier once the formula is signed off.
alter table commission_ledger
  add column if not exists rep_tier_at_earn text
    check (rep_tier_at_earn in ('full','reduced','transferred')),
  add column if not exists decay_multiplier numeric(4,3);

-- 3. Helper view - one row per rep with the inputs the app needs to
--    compute decay state. Cheap; no need to materialise.
create or replace view rep_decay_inputs as
select
  r.id                            as rep_id,
  r.created_at                    as rep_started_at,
  greatest(
    r.last_close_at,
    (
      select max(c.created_at)
      from closes c
      where c.rep_id = r.id
        and c.status not in ('cancelled','rejected')
    )
  ) as last_close_at
from sales_reps r;

-- 4. Backfill last_close_at once so the cache matches reality.
update sales_reps r
set last_close_at = sub.last_close_at
from (
  select rep_id, max(created_at) as last_close_at
  from closes
  where status not in ('cancelled','rejected')
  group by rep_id
) sub
where sub.rep_id = r.id
  and (r.last_close_at is null or r.last_close_at < sub.last_close_at);
