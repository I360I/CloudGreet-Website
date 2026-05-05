-- Per-business "edge case" instruction snippets that reps can add
-- without touching the base prompt. Each is a free-text instruction
-- that gets appended to the Retell LLM's general_prompt under a
-- "SPECIAL HANDLING" section the next time the agent syncs.
--
-- Shape: array of { id, label, instruction, created_at, created_by_rep_id? }
-- Length-capped to ~10 entries / 500 chars each in API validation.
alter table public.businesses
  add column if not exists agent_edge_cases jsonb not null default '[]'::jsonb;
