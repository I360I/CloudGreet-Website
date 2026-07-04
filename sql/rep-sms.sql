-- Rep <-> lead SMS log for the dialer's post-call text follow-up.
-- COMPLIANCE NOTE: outbound texting from rep DIDs needs a Telnyx
-- Messaging Profile and A2P 10DLC registration for reliable US
-- deliverability. Inbound STOP replies MUST flip the lead to
-- do_not_call (handled in app/api/telnyx/rep-sms-webhook).
CREATE TABLE IF NOT EXISTS public.rep_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL,
  lead_id UUID,
  direction TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  telnyx_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_messages_rep ON public.rep_messages (rep_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rep_messages_lead ON public.rep_messages (lead_id, created_at DESC);
