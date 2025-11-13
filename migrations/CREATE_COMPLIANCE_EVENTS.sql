CREATE TABLE IF NOT EXISTS compliance_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('voice', 'sms', 'email', 'onboarding')),
    event_type TEXT NOT NULL,
    path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_events_tenant_created ON compliance_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_events_channel ON compliance_events (channel);

