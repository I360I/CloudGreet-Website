CREATE TABLE IF NOT EXISTS prospecting_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (provider)
);

COMMENT ON TABLE prospecting_filters IS 'Stores admin-configured filters used when syncing external prospect data.';

CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT,
    provider TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    company_name TEXT,
    job_title TEXT,
    industry TEXT,
    website TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    employee_range TEXT,
    revenue_range TEXT,
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    score NUMERIC,
    tags TEXT[],
    assigned_to UUID REFERENCES custom_users(id),
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects (status);
CREATE INDEX IF NOT EXISTS idx_prospects_provider ON prospects (provider);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned_to ON prospects (assigned_to);
CREATE INDEX IF NOT EXISTS idx_prospects_city_state ON prospects (city, state);

CREATE TABLE IF NOT EXISTS prospect_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    filters JSONB NOT NULL,
    fetched_count INTEGER NOT NULL DEFAULT 0,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'success',
    message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_prospect_sync_logs_provider ON prospect_sync_logs (provider);
CREATE INDEX IF NOT EXISTS idx_prospect_sync_logs_started_at ON prospect_sync_logs (started_at DESC);

CREATE TABLE IF NOT EXISTS outreach_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    channel TEXT NOT NULL, -- email, sms, call
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_sequences_active ON outreach_sequences (is_active);


