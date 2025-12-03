-- =====================================================
-- CREATE BACKGROUND_JOBS TABLE
-- Required for async job processing (SMS, emails, etc.)
-- =====================================================

-- Create background_jobs table
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('send_email', 'send_sms', 'process_webhook', 'sync_calendar', 'generate_report', 'cleanup_old_data')),
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_created_at ON background_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_background_jobs_processed_at ON background_jobs(processed_at);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type ON background_jobs(type);

-- Create composite index for querying pending jobs
CREATE INDEX IF NOT EXISTS idx_background_jobs_pending ON background_jobs(status, created_at) 
WHERE status = 'pending';

-- Add RLS policies (if needed)
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage all jobs (service_role)
CREATE POLICY "System can manage background jobs" ON background_jobs
    FOR ALL USING (true);


