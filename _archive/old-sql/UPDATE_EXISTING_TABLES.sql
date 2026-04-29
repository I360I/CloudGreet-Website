-- =====================================================
-- UPDATE EXISTING TABLES FOR CRM ENHANCEMENTS
-- Updates existing tables to match our new API expectations
-- Run this AFTER creating the new tables
-- =====================================================

-- ============================================================================
-- UPDATE FOLLOW_UP_SEQUENCES TABLE
-- ============================================================================

-- Add missing columns to follow_up_sequences table
ALTER TABLE public.follow_up_sequences 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS trigger_event TEXT DEFAULT 'lead_created' CHECK (trigger_event IN ('lead_created', 'no_response', 'meeting_scheduled', 'deal_closed', 'custom')),
ADD COLUMN IF NOT EXISTS trigger_delay INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;

-- Update the existing steps column structure if needed
-- (The existing steps JSONB should work, but we can add validation)

-- Add comments to the new columns
COMMENT ON COLUMN public.follow_up_sequences.description IS 'Description of the follow-up sequence';
COMMENT ON COLUMN public.follow_up_sequences.trigger_event IS 'Event that triggers this sequence';
COMMENT ON COLUMN public.follow_up_sequences.trigger_delay IS 'Delay in hours before sequence starts';
COMMENT ON COLUMN public.follow_up_sequences.conditions IS 'Conditions that must be met for sequence to trigger';

-- ============================================================================
-- UPDATE ENRICHED_LEADS TABLE (if needed)
-- ============================================================================

-- Add missing columns to enriched_leads if they don't exist
ALTER TABLE public.enriched_leads 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS current_stage UUID,
ADD COLUMN IF NOT EXISTS pipeline_id UUID,
ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
ADD COLUMN IF NOT EXISTS expected_close_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS assigned_to UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_enriched_leads_business_id ON public.enriched_leads(business_id);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_status ON public.enriched_leads(status);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_priority ON public.enriched_leads(priority);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_source ON public.enriched_leads(source);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_assigned_to ON public.enriched_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_pipeline_id ON public.enriched_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_current_stage ON public.enriched_leads(current_stage);

-- ============================================================================
-- UPDATE BUSINESSES TABLE (if needed)
-- ============================================================================

-- Add any missing columns to businesses table that our new features might need
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS employee_count INTEGER,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "17:00"}, "wednesday": {"open": "09:00", "close": "17:00"}, "thursday": {"open": "09:00", "close": "17:00"}, "friday": {"open": "09:00", "close": "17:00"}, "saturday": {"closed": true}, "sunday": {"closed": true}}'::jsonb,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key constraints for enriched_leads if they don't exist
DO $$ 
BEGIN
    -- Only add if the constraint doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'enriched_leads_business_id_fkey'
    ) THEN
        ALTER TABLE public.enriched_leads 
        ADD CONSTRAINT enriched_leads_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for current_stage if it exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'enriched_leads_current_stage_fkey'
    ) THEN
        ALTER TABLE public.enriched_leads 
        ADD CONSTRAINT enriched_leads_current_stage_fkey 
        FOREIGN KEY (current_stage) REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key for pipeline_id if it exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'enriched_leads_pipeline_id_fkey'
    ) THEN
        ALTER TABLE public.enriched_leads 
        ADD CONSTRAINT enriched_leads_pipeline_id_fkey 
        FOREIGN KEY (pipeline_id) REFERENCES public.crm_pipelines(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key for assigned_to if it exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'enriched_leads_assigned_to_fkey'
    ) THEN
        ALTER TABLE public.enriched_leads 
        ADD CONSTRAINT enriched_leads_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- UPDATE EXISTING DATA
-- ============================================================================

-- Set default business_id for existing enriched_leads if not set
UPDATE public.enriched_leads 
SET business_id = (
    SELECT id FROM public.businesses 
    WHERE businesses.id IS NOT NULL 
    LIMIT 1
)
WHERE business_id IS NULL;

-- Set default source for existing enriched_leads if not set
UPDATE public.enriched_leads 
SET source = 'existing_data'
WHERE source IS NULL OR source = '';

-- Set default status for existing enriched_leads if not set
UPDATE public.enriched_leads 
SET status = 'new'
WHERE status IS NULL OR status = '';

-- ============================================================================
-- CREATE DEFAULT PIPELINE AND STAGES
-- ============================================================================

-- Create a default pipeline for each business
INSERT INTO public.crm_pipelines (business_id, name, description, is_active, is_default)
SELECT 
    id,
    'Default Sales Pipeline',
    'Standard sales pipeline for lead management',
    true,
    true
FROM public.businesses
WHERE id NOT IN (SELECT business_id FROM public.crm_pipelines WHERE is_default = true)
ON CONFLICT DO NOTHING;

-- Create default pipeline stages
INSERT INTO public.pipeline_stages (pipeline_id, business_id, name, description, position, color, is_active, is_default)
SELECT 
    p.id,
    p.business_id,
    stage_name,
    stage_description,
    stage_position,
    stage_color,
    true,
    false
FROM public.crm_pipelines p
CROSS JOIN (
    VALUES 
        ('New Lead', 'Recently acquired leads', 1, 'blue'),
        ('Contacted', 'Leads that have been contacted', 2, 'yellow'),
        ('Qualified', 'Leads that have been qualified', 3, 'orange'),
        ('Proposal', 'Leads with active proposals', 4, 'purple'),
        ('Negotiation', 'Leads in negotiation phase', 5, 'red'),
        ('Closed Won', 'Successfully closed deals', 6, 'green'),
        ('Closed Lost', 'Lost opportunities', 7, 'gray')
) AS stages(stage_name, stage_description, stage_position, stage_color)
WHERE p.is_default = true
AND NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps 
    WHERE ps.pipeline_id = p.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE DEFAULT LEAD SEGMENTS
-- ============================================================================

-- Create default lead segments for each business
INSERT INTO public.lead_segments (business_id, name, description, color, is_active)
SELECT 
    id,
    segment_name,
    segment_description,
    segment_color,
    true
FROM public.businesses
CROSS JOIN (
    VALUES 
        ('Hot Leads', 'High-priority leads ready to buy', 'red'),
        ('Warm Leads', 'Interested leads that need nurturing', 'orange'),
        ('Cold Leads', 'Leads that need initial engagement', 'blue'),
        ('Existing Customers', 'Current customers for upselling', 'green'),
        ('Referrals', 'Leads from customer referrals', 'purple')
) AS segments(segment_name, segment_description, segment_color)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE DEFAULT ATTRIBUTION MODELS
-- ============================================================================

-- Create default attribution models for each business
INSERT INTO public.attribution_models (business_id, name, description, model_type, weights, is_default)
SELECT 
    id,
    model_name,
    model_description,
    model_type,
    model_weights,
    is_default_model
FROM public.businesses
CROSS JOIN (
    VALUES 
        ('First Touch Attribution', 'Gives 100% credit to the first touchpoint', 'first_touch', '{"first_touch": 1.0}'::jsonb, true),
        ('Last Touch Attribution', 'Gives 100% credit to the last touchpoint', 'last_touch', '{"last_touch": 1.0}'::jsonb, false),
        ('Linear Attribution', 'Distributes credit evenly across all touchpoints', 'linear', '{"linear": 1.0}'::jsonb, false),
        ('Time Decay Attribution', 'Gives more credit to recent touchpoints', 'time_decay', '{"time_decay": 1.0}'::jsonb, false)
) AS models(model_name, model_description, model_type, model_weights, is_default_model)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE DEFAULT LEAD SOURCES
-- ============================================================================

-- Create default lead sources for each business
INSERT INTO public.lead_sources (business_id, name, type, category, cost, is_active)
SELECT 
    id,
    source_name,
    source_type,
    source_category,
    source_cost,
    true
FROM public.businesses
CROSS JOIN (
    VALUES 
        ('Google Search', 'organic', 'search', 0.00),
        ('Google Ads', 'paid', 'search', 500.00),
        ('Facebook Ads', 'paid', 'social', 300.00),
        ('LinkedIn', 'social', 'social', 0.00),
        ('Email Marketing', 'email', 'email', 100.00),
        ('Referrals', 'referral', 'referral', 0.00),
        ('Direct Traffic', 'direct', 'direct', 0.00),
        ('Other', 'other', 'other', 0.00)
) AS sources(source_name, source_type, source_category, source_cost)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if follow_up_sequences was updated correctly
SELECT 
    'follow_up_sequences' as table_name,
    CASE 
        WHEN column_name = 'description' THEN '✅ Added description column'
        WHEN column_name = 'trigger_event' THEN '✅ Added trigger_event column'
        WHEN column_name = 'trigger_delay' THEN '✅ Added trigger_delay column'
        WHEN column_name = 'conditions' THEN '✅ Added conditions column'
        ELSE '❌ Column missing: ' || column_name
    END as status
FROM information_schema.columns 
WHERE table_name = 'follow_up_sequences' 
AND table_schema = 'public'
AND column_name IN ('description', 'trigger_event', 'trigger_delay', 'conditions');

-- Check if enriched_leads was updated correctly
SELECT 
    'enriched_leads' as table_name,
    CASE 
        WHEN column_name = 'business_id' THEN '✅ Added business_id column'
        WHEN column_name = 'current_stage' THEN '✅ Added current_stage column'
        WHEN column_name = 'pipeline_id' THEN '✅ Added pipeline_id column'
        WHEN column_name = 'estimated_value' THEN '✅ Added estimated_value column'
        WHEN column_name = 'status' THEN '✅ Added status column'
        WHEN column_name = 'priority' THEN '✅ Added priority column'
        ELSE '❌ Column missing: ' || column_name
    END as status
FROM information_schema.columns 
WHERE table_name = 'enriched_leads' 
AND table_schema = 'public'
AND column_name IN ('business_id', 'current_stage', 'pipeline_id', 'estimated_value', 'status', 'priority');

-- Check default data creation
SELECT 
    'Default Data' as category,
    COUNT(*) as count,
    'Created' as status
FROM public.crm_pipelines 
WHERE is_default = true
UNION ALL
SELECT 
    'Pipeline Stages',
    COUNT(*),
    'Created'
FROM public.pipeline_stages
UNION ALL
SELECT 
    'Lead Segments',
    COUNT(*),
    'Created'
FROM public.lead_segments
UNION ALL
SELECT 
    'Attribution Models',
    COUNT(*),
    'Created'
FROM public.attribution_models
UNION ALL
SELECT 
    'Lead Sources',
    COUNT(*),
    'Created'
FROM public.lead_sources;
