-- Background Job Queue Table
-- Used for async processing in serverless environments

CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error TEXT,
  tenant_id UUID REFERENCES businesses(id) ON DELETE CASCADE
);

-- Indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON background_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_processed_at ON background_jobs(processed_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_type ON background_jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON background_jobs(tenant_id) WHERE tenant_id IS NOT NULL;

-- Cleanup old completed/failed jobs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM background_jobs
  WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup via cron (if pg_cron extension available)
-- SELECT cron.schedule('cleanup-old-jobs', '0 2 * * *', 'SELECT cleanup_old_jobs()');



-- Used for async processing in serverless environments

CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error TEXT,
  tenant_id UUID REFERENCES businesses(id) ON DELETE CASCADE
);

-- Indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON background_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_processed_at ON background_jobs(processed_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_type ON background_jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON background_jobs(tenant_id) WHERE tenant_id IS NOT NULL;

-- Cleanup old completed/failed jobs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM background_jobs
  WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup via cron (if pg_cron extension available)
-- SELECT cron.schedule('cleanup-old-jobs', '0 2 * * *', 'SELECT cleanup_old_jobs()');


