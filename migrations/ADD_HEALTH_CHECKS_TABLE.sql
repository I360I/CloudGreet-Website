-- Health Checks Table
-- Stores historical health check results for monitoring and trend analysis

CREATE TABLE IF NOT EXISTS health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down', 'not_configured')),
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  check_type TEXT NOT NULL CHECK (check_type IN ('api', 'workflow', 'security', 'performance', 'metric')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_health_checks_service_created ON health_checks(service_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_created_at ON health_checks(created_at DESC);

-- Grant permissions
GRANT ALL PRIVILEGES ON health_checks TO service_role;
GRANT SELECT ON health_checks TO authenticated;

-- Disable RLS for now (admin-only table)
ALTER TABLE health_checks DISABLE ROW LEVEL SECURITY;

