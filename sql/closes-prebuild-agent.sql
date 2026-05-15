-- Per-close pre-build agent storage.
--
-- Lets the admin run the agent workshop (paste website, generate
-- prompt, create + save a Retell agent ID) BEFORE the rep's prospect
-- has created their CloudGreet account. When the prospect later
-- creates their account and convertCloseToClient provisions a business
-- row, the stored agent_id is auto-stamped onto the new business and
-- ai_agents row - the rep just dials the demo number, no extra
-- workshop trip required.

alter table closes
  add column if not exists website text,
  add column if not exists retell_agent_id text;

create index if not exists closes_retell_agent_id_idx
  on closes (retell_agent_id)
  where retell_agent_id is not null;
