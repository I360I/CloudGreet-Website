-- ============================================================
-- Agent draft pipeline (Phase 1)
-- ============================================================
-- Per-close storage for the AI-generated demo agent prompt.
-- Phase 1 from "CloudGreet — AI-Powered Agent Builder System": scrape,
-- single Claude call, admin review + manual paste to Retell.
--
-- Lifecycle:
--   none       - not generated yet
--   generating - pipeline is running
--   ready      - draft generated, waiting on admin review
--   failed     - pipeline error (retryable)
--   approved   - admin approved + copied to Retell
--
-- Idempotent.
-- ============================================================

alter table closes
  add column if not exists agent_draft_status text not null default 'none'
    check (agent_draft_status in ('none','generating','ready','failed','approved')),
  -- Business Context Document - the structured JSON we hand to Claude.
  -- Stored so the admin can audit what the model saw + we can regenerate
  -- without re-scraping.
  add column if not exists agent_draft_context jsonb,
  -- The Claude-generated prompt, untouched.
  add column if not exists agent_draft_prompt text,
  -- After admin edits + clicks approve.
  add column if not exists agent_draft_approved_prompt text,
  -- Static-validation summary {passed: bool, checks: [{name, ok, detail}]}.
  add column if not exists agent_draft_validation jsonb,
  -- Free-form error if the pipeline failed (so we don't lose the reason).
  add column if not exists agent_draft_error text,
  -- Anthropic + scrape cost, in micro-dollars (1e6 = $1) for accounting.
  add column if not exists agent_draft_cost_micro integer,
  add column if not exists agent_draft_generated_at timestamptz,
  add column if not exists agent_draft_approved_at  timestamptz;

create index if not exists closes_agent_draft_status_idx
  on closes (agent_draft_status);
