-- The original lead_assignments_status_check constraint contained a
-- corrupted string literal ('inte\n  rested' - a newline + indentation
-- accidentally inside the quotes), so every attempt to set a lead to
-- 'interested' was rejected by Postgres while the UI's optimistic
-- update showed success. It also predated the demo_showed status that
-- the weekly demos-held goal counts. Recreated with the correct list.
ALTER TABLE public.lead_assignments DROP CONSTRAINT lead_assignments_status_check;
ALTER TABLE public.lead_assignments ADD CONSTRAINT lead_assignments_status_check
  CHECK (status IN ('new','called','voicemail','interested','demo_scheduled','demo_showed','proposal_sent','closed','dead','do_not_call'));
