-- ============================================================
-- Rep async onboarding - progress columns
-- ============================================================
-- Tracks each rep's progress through the 7-step async onboarding flow
-- (welcome, comp, stripe connect, dashboard, sales pitch, demo, quiz).
--
-- Step content lives in lib/sales/onboarding-steps.ts. Quiz bank lives
-- in lib/sales/onboarding-quiz.ts. Adding/reordering a step is a code
-- change only - no migration.
--
-- Idempotent.
-- ============================================================

alter table sales_reps
  add column if not exists onboarding_started_at   timestamptz,
  add column if not exists onboarding_completed_at timestamptz,
  -- 1..7. Once quiz_passed_at is set, current_onboarding_step stays at 7.
  add column if not exists current_onboarding_step integer not null default 1
    check (current_onboarding_step between 1 and 7),
  add column if not exists quiz_attempts           integer not null default 0,
  add column if not exists quiz_passed_at          timestamptz,
  add column if not exists last_quiz_score         integer; -- 0..100, last attempt
