-- 2026-07-16: the disposition dropdown (SetterLeadsWorkspace / LeadsWorkspace)
-- offers 13 status keys, but the CHECK constraint only allowed 10. Reps picking
-- "Not avail", "Not interested", or "Wrong DM" hit
--   new row for relation "lead_assignments" violates check constraint
--   "lead_assignments_status_check"
-- and the outcome silently failed to save. Add the three missing keys so every
-- dropdown option persists.
alter table lead_assignments drop constraint if exists lead_assignments_status_check;
alter table lead_assignments add constraint lead_assignments_status_check
  check (status = any (array[
    'new','called','voicemail','interested','demo_scheduled','demo_showed',
    'proposal_sent','closed','dead','not_available','not_interested','wrong_dm','do_not_call'
  ]::text[]));
