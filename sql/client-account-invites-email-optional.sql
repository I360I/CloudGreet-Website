-- Make prospect_email nullable on client_account_invites.
--
-- Reps want to share a self-serve link with a prospect even when we
-- don't have the prospect's email yet (cold-call where the contractor
-- gave their phone but not email). The prospect fills it in on the
-- public create-account page. Idempotent.

alter table client_account_invites
  alter column prospect_email drop not null;

notify pgrst, 'reload schema';
