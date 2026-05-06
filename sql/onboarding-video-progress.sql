-- ============================================================
-- Async onboarding - per-business video walkthrough progress
-- ============================================================
-- Stores which video walkthrough steps a business has watched and
-- ticked off as done. Schema is intentionally a JSON blob so adding
-- or renaming steps is a code-only change in lib/onboarding/video-steps.ts
-- - no migration needed.
--
-- Shape: { [stepKey]: { watched: boolean, completed: boolean, updated_at: iso } }
-- ============================================================

alter table businesses
  add column if not exists onboarding_video_progress jsonb not null default '{}'::jsonb;
