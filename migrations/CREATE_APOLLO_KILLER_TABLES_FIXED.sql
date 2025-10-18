-- =====================================================
-- APOLLO KILLER SYSTEM TABLES (FIXED VERSION)
-- =====================================================

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS bulk_enrichment_logs CASCADE;
DROP TABLE IF EXISTS bulk_enrichment_jobs CASCADE;
DROP TABLE IF EXISTS enrichment_queue CASCADE;
DROP TABLE IF EXISTS enriched_leads CASCADE;

-- Enriched Leads Table (Main leads storage)
CREATE TABLE enriched_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    phone VARCHAR(20),
    website VARCHAR(255),
    google_place_id VARCHAR(255) UNIQUE,
    business_type VARCHAR(100),
    google_rating DECIMAL(3,2),
    google_review_count INTEGER DEFAULT 0,
    
    -- Owner/Contact Information
    owner_name VARCHAR(255),
    owner_title VARCHAR(255),
    owner_email VARCHAR(255),
    owner_email_verified BOOLEAN DEFAULT FALSE,
    owner_email_confidence DECIMAL(3,2),
    owner_phone VARCHAR(20),
    owner_linkedin_url TEXT,
    
    -- Enrichment Data
    enrichment_status VARCHAR(20) DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'in_progress', 'enriched', 'failed')),
    enrichment_sources TEXT[] DEFAULT '{}',
    enrichment_attempts INTEGER DEFAULT 0,
    last_enriched_at TIMESTAMP WITH TIME ZONE,
    
    -- AI Scoring
    total_score INTEGER DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
    fit_score INTEGER DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 25),
    engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 25),
    contact_quality_score INTEGER DEFAULT 0 CHECK (contact_quality_score >= 0 AND contact_quality_score <= 25),
    opportunity_score INTEGER DEFAULT 0 CHECK (opportunity_score >= 0 AND opportunity_score <= 25),
    urgency_score INTEGER DEFAULT 0 CHECK (urgency_score >= 0 AND urgency_score <= 25),
    
    -- AI Insights
    personalized_pitch TEXT,
    pain_points TEXT[] DEFAULT '{}',
    recommended_approach TEXT,
    best_contact_time VARCHAR(50),
    objections_anticipated TEXT[] DEFAULT '{}',
    
    -- Business Intelligence
    employee_count_min INTEGER,
    employee_count_max INTEGER,
    estimated_revenue_min DECIMAL(12,2),
    estimated_revenue_max DECIMAL(12,2),
    has_online_booking BOOLEAN DEFAULT FALSE,
    has_live_chat BOOLEAN DEFAULT FALSE,
    has_ai_receptionist BOOLEAN DEFAULT FALSE,
    detected_technologies TEXT[] DEFAULT '{}',
    
    -- Decision Makers (JSONB)
    decision_makers JSONB DEFAULT '[]',
    
    -- Outreach Tracking
    outreach_status VARCHAR(20) DEFAULT 'new' CHECK (outreach_status IN ('new', 'contacted', 'responded', 'qualified', 'converted', 'closed')),
    first_contact_date TIMESTAMP WITH TIME ZONE,
    last_contact_date TIMESTAMP WITH TIME ZONE,
    contact_attempts INTEGER DEFAULT 0,
    sms_sent INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    last_sms_sent_at TIMESTAMP WITH TIME ZONE,
    last_email_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Assignment & Tags
    assigned_to UUID,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrichment Queue Table
CREATE TABLE enrichment_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES enriched_leads(id) ON DELETE CASCADE,
    enrichment_tasks TEXT[] NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk Enrichment Jobs Table
CREATE TABLE bulk_enrichment_jobs (
    id VARCHAR(255) PRIMARY KEY,
    lead_ids UUID[] NOT NULL,
    total_leads INTEGER NOT NULL,
    processed_leads INTEGER DEFAULT 0,
    successful_leads INTEGER DEFAULT 0,
    failed_leads INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    batch_size INTEGER DEFAULT 5,
    created_by UUID,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk Enrichment Logs Table
CREATE TABLE bulk_enrichment_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id VARCHAR(255) NOT NULL REFERENCES bulk_enrichment_jobs(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES enriched_leads(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
    message TEXT,
    score INTEGER,
    processing_time_ms INTEGER,
    error_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Enriched Leads Indexes
CREATE INDEX idx_enriched_leads_business_name ON enriched_leads(business_name);
CREATE INDEX idx_enriched_leads_enrichment_status ON enriched_leads(enrichment_status);
CREATE INDEX idx_enriched_leads_total_score ON enriched_leads(total_score);
CREATE INDEX idx_enriched_leads_business_type ON enriched_leads(business_type);
CREATE INDEX idx_enriched_leads_outreach_status ON enriched_leads(outreach_status);
CREATE INDEX idx_enriched_leads_assigned_to ON enriched_leads(assigned_to);
CREATE INDEX idx_enriched_leads_created_at ON enriched_leads(created_at);
CREATE INDEX idx_enriched_leads_google_place_id ON enriched_leads(google_place_id);

-- Enrichment Queue Indexes
CREATE INDEX idx_enrichment_queue_status ON enrichment_queue(status);
CREATE INDEX idx_enrichment_queue_priority ON enrichment_queue(priority);
CREATE INDEX idx_enrichment_queue_created_at ON enrichment_queue(created_at);

-- Bulk Jobs Indexes
CREATE INDEX idx_bulk_enrichment_jobs_status ON bulk_enrichment_jobs(status);
CREATE INDEX idx_bulk_enrichment_jobs_created_by ON bulk_enrichment_jobs(created_by);
CREATE INDEX idx_bulk_enrichment_jobs_created_at ON bulk_enrichment_jobs(created_at);

-- Bulk Logs Indexes
CREATE INDEX idx_bulk_enrichment_logs_job_id ON bulk_enrichment_logs(job_id);
CREATE INDEX idx_bulk_enrichment_logs_lead_id ON bulk_enrichment_logs(lead_id);
CREATE INDEX idx_bulk_enrichment_logs_status ON bulk_enrichment_logs(status);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Create update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update timestamp trigger for enriched_leads
CREATE TRIGGER update_enriched_leads_updated_at BEFORE UPDATE ON enriched_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for bulk_enrichment_jobs
CREATE TRIGGER update_bulk_enrichment_jobs_updated_at BEFORE UPDATE ON bulk_enrichment_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant permissions to service_role
GRANT ALL ON TABLE enriched_leads TO service_role;
GRANT ALL ON TABLE enrichment_queue TO service_role;
GRANT ALL ON TABLE bulk_enrichment_jobs TO service_role;
GRANT ALL ON TABLE bulk_enrichment_logs TO service_role;

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE enriched_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE enrichment_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bulk_enrichment_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bulk_enrichment_logs TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify tables were created
SELECT 'APOLLO KILLER TABLES CREATED:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%enrichment%' OR tablename = 'enriched_leads') ORDER BY tablename;

-- Count tables
SELECT 'TOTAL APOLLO KILLER TABLES:' as info, COUNT(*) as count 
FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename LIKE '%enrichment%' OR tablename = 'enriched_leads');

SELECT '🎉 APOLLO KILLER SYSTEM READY!' as status;

