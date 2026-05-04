-- Per-call structured data extracted by Retell's post-call analysis.
-- Each blob mirrors the agent's post_call_analysis_data field
-- definitions: { service_requested: "...", budget_mentioned: 1500, ... }
-- JSONB so the schema can change per client without a migration.

alter table calls
  add column if not exists call_extractions jsonb;

create index if not exists calls_extractions_idx
  on calls using gin (call_extractions);

-- Per-business definition of which fields to extract. The admin UI
-- writes this; we sync to Retell's agent.post_call_analysis_data on
-- save so the agent knows what to capture.
alter table businesses
  add column if not exists extraction_fields jsonb;
