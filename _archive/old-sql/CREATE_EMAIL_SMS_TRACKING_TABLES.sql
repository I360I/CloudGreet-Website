-- EMAIL & SMS TRACKING TABLES
-- For Apollo Killer email/SMS engagement tracking

-- ============================================================================
-- EMAIL TRACKING EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click', 'bounce', 'spam')),
  
  -- Tracking data
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Indexes for performance
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SMS TRACKING EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sms_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  
  -- Telnyx message details
  message_id TEXT, -- Telnyx message ID
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'failed', 'received')),
  
  -- Contact details
  phone_number TEXT,
  message_text TEXT, -- For received messages
  
  -- Tracking data
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional metadata (error codes, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADD TRACKING COLUMNS TO ENRICHED LEADS
-- ============================================================================

-- Add email tracking columns
ALTER TABLE public.enriched_leads 
ADD COLUMN IF NOT EXISTS last_email_clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sms_delivered INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sms_response_at TIMESTAMPTZ;

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_email_tracking_lead_id ON public.email_tracking_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_event_type ON public.email_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_timestamp ON public.email_tracking_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sms_tracking_lead_id ON public.sms_tracking_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_sms_tracking_event_type ON public.sms_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sms_tracking_message_id ON public.sms_tracking_events(message_id);
CREATE INDEX IF NOT EXISTS idx_sms_tracking_timestamp ON public.sms_tracking_events(timestamp DESC);

-- ============================================================================
-- RLS POLICIES (Security)
-- ============================================================================

ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_tracking_events ENABLE ROW LEVEL SECURITY;

-- Service role can manage all
CREATE POLICY "Service role full access - email_tracking"
  ON public.email_tracking_events FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - sms_tracking"
  ON public.sms_tracking_events FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.email_tracking_events IS 'Tracks email opens, clicks, bounces for Apollo Killer outreach campaigns';
COMMENT ON TABLE public.sms_tracking_events IS 'Tracks SMS delivery, responses for Apollo Killer outreach campaigns';

COMMENT ON COLUMN public.email_tracking_events.event_type IS 'open, click, bounce, or spam';
COMMENT ON COLUMN public.sms_tracking_events.event_type IS 'sent, delivered, failed, or received';
COMMENT ON COLUMN public.sms_tracking_events.message_text IS 'Content of received SMS (replies from leads)';
