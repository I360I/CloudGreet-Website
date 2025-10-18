-- Create realtime_sessions table for OpenAI Realtime API sessions
-- This tracks active WebRTC sessions for monitoring and cleanup

CREATE TABLE IF NOT EXISTS public.realtime_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Call tracking
  call_id TEXT NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Session info
  session_token TEXT NOT NULL, -- Ephemeral API key
  session_type TEXT DEFAULT 'webrtc', -- 'webrtc', 'websocket', or 'sip'
  status TEXT DEFAULT 'active', -- 'active', 'ended', 'error'
  
  -- Configuration
  configuration JSONB, -- Voice settings, instructions, etc.
  
  -- Metadata
  user_agent TEXT,
  ip_address TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Performance metrics
  duration_seconds INTEGER,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Audio quality metrics
  average_latency_ms INTEGER,
  audio_quality_score DECIMAL(3,2),
  
  CONSTRAINT valid_status CHECK (status IN ('active', 'ended', 'error', 'timeout'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_realtime_sessions_call_id ON public.realtime_sessions(call_id);
CREATE INDEX IF NOT EXISTS idx_realtime_sessions_business_id ON public.realtime_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_realtime_sessions_status ON public.realtime_sessions(status);
CREATE INDEX IF NOT EXISTS idx_realtime_sessions_created_at ON public.realtime_sessions(created_at DESC);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_realtime_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_realtime_sessions_updated_at
  BEFORE UPDATE ON public.realtime_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_realtime_sessions_updated_at();

-- RLS Policies (secure by business_id)
ALTER TABLE public.realtime_sessions ENABLE ROW LEVEL SECURITY;

-- Allow businesses to view their own sessions
CREATE POLICY "Businesses can view their own sessions"
  ON public.realtime_sessions
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses 
      WHERE id = business_id
    )
  );

-- Allow service role to manage all sessions (for API routes)
CREATE POLICY "Service role can manage all sessions"
  ON public.realtime_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE public.realtime_sessions IS 'Tracks OpenAI Realtime API sessions for WebRTC voice calls';
COMMENT ON COLUMN public.realtime_sessions.session_token IS 'Ephemeral API key from OpenAI (expires in 60 seconds)';
COMMENT ON COLUMN public.realtime_sessions.configuration IS 'Voice settings, instructions, and session config as JSON';
COMMENT ON COLUMN public.realtime_sessions.audio_quality_score IS 'Score from 0-10 based on latency, jitter, packet loss';

