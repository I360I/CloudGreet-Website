-- BULK ENRICHMENT TRACKING TABLES
-- For Apollo Killer bulk processing with progress tracking

-- ============================================================================
-- BULK ENRICHMENT JOBS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bulk_enrichment_jobs (
  id TEXT PRIMARY KEY,
  
  -- Job configuration
  lead_ids UUID[] NOT NULL,
  total_leads INTEGER NOT NULL,
  batch_size INTEGER DEFAULT 5,
  
  -- Progress tracking
  processed_leads INTEGER DEFAULT 0,
  successful_leads INTEGER DEFAULT 0,
  failed_leads INTEGER DEFAULT 0,
  
  -- Status tracking
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,
  
  -- Error tracking
  error_summary TEXT,
  
  -- Metadata
  created_by UUID, -- Admin user who started the job
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BULK ENRICHMENT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bulk_enrichment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  job_id TEXT REFERENCES public.bulk_enrichment_jobs(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE SET NULL,
  
  -- Processing result
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  message TEXT,
  
  -- Performance metrics
  processing_time_ms INTEGER,
  score INTEGER, -- Lead score after enrichment
  
  -- Error details
  error_details JSONB,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_status ON public.bulk_enrichment_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_jobs_created_by ON public.bulk_enrichment_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_bulk_jobs_created_at ON public.bulk_enrichment_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_logs_job_id ON public.bulk_enrichment_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_logs_lead_id ON public.bulk_enrichment_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_bulk_logs_status ON public.bulk_enrichment_logs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_logs_created_at ON public.bulk_enrichment_logs(created_at DESC);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bulk_jobs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bulk_jobs_updated_at
  BEFORE UPDATE ON public.bulk_enrichment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_bulk_jobs_timestamp();

-- ============================================================================
-- RLS POLICIES (Security)
-- ============================================================================

ALTER TABLE public.bulk_enrichment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_enrichment_logs ENABLE ROW LEVEL SECURITY;

-- Service role can manage all
CREATE POLICY "Service role full access - bulk_jobs"
  ON public.bulk_enrichment_jobs FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - bulk_logs"
  ON public.bulk_enrichment_logs FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.bulk_enrichment_jobs IS 'Tracks bulk lead enrichment jobs with progress and status';
COMMENT ON TABLE public.bulk_enrichment_logs IS 'Logs individual lead processing results for bulk jobs';

COMMENT ON COLUMN public.bulk_enrichment_jobs.lead_ids IS 'Array of lead UUIDs to be processed';
COMMENT ON COLUMN public.bulk_enrichment_jobs.status IS 'Current job status: queued, processing, completed, failed, cancelled';
COMMENT ON COLUMN public.bulk_enrichment_logs.processing_time_ms IS 'Time taken to enrich this specific lead';
COMMENT ON COLUMN public.bulk_enrichment_logs.score IS 'Final lead quality score after enrichment';
