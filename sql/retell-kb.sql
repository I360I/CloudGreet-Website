-- Per-business Retell knowledge base id.
-- Set the first time we sync; reused for subsequent updates so the
-- agent always references the same KB across edits.

alter table businesses
  add column if not exists retell_kb_id text;
