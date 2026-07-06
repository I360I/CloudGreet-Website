-- Applied live 2026-07-06 as migration rep_messages_delivery_status.
--
-- The owner's live test: inbound to the setter line worked, the reply
-- was accepted by Telnyx (status 'sent'), but never reached his phone.
-- Telnyx reports the final per-recipient outcome via message.finalized
-- webhooks, which sms-webhook was discarding for rep texts - so a
-- carrier drop (e.g. a number missing from the 10DLC campaign) was
-- invisible. Now the DLR stamps rep_messages.status (delivered /
-- delivery_failed / ...) and error_detail carries the carrier reason.

ALTER TABLE rep_messages ADD COLUMN IF NOT EXISTS error_detail TEXT;
