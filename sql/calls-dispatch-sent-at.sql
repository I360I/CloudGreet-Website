-- calls.dispatch_sent_at: marks that a dispatch/callback notification went
-- out for a call. Used by the call_analyzed safety net that re-sends dropped
-- dispatches (the voice agent sometimes promises a callback but never fires
-- send_dispatch_request). The agent's own dispatch stamps this; the safety
-- net checks it to stay idempotent and stamps it when it fires.
--
-- Idempotent: safe to re-run.

alter table public.calls add column if not exists dispatch_sent_at timestamptz;
