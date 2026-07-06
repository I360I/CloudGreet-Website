-- Inbound return-call handling + SMS read state (applied live as
-- migration inbound_calls_and_sms_read_state).
--  - custom_users.personal_cell: setter's forwarding cell for inbound
--    return calls (admin-set on /admin/setters; setters have no
--    sales_reps row by design so the webhook falls back to this).
--  - rep_calls.direction: 'outbound' (dialer) | 'inbound' (return call).
--  - rep_messages.read_at: unread tracking for inbound texts.
ALTER TABLE public.custom_users ADD COLUMN IF NOT EXISTS personal_cell TEXT;
ALTER TABLE public.rep_calls ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound';
ALTER TABLE public.rep_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_rep_messages_unread ON public.rep_messages (rep_id) WHERE direction = 'inbound' AND read_at IS NULL;
