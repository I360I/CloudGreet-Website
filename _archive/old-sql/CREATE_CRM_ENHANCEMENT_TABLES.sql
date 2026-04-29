-- =====================================================
-- CLOUDGREET CRM ENHANCEMENT TABLES
-- Missing tables for Phase 3 CRM features
-- Run this in Supabase SQL Editor
-- =====================================================

-- ============================================================================
-- ADMIN USERS TABLE (for team management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'agent')),
  
  -- Permissions
  can_assign_leads BOOLEAN DEFAULT true,
  can_export_data BOOLEAN DEFAULT true,
  can_manage_campaigns BOOLEAN DEFAULT true,
  can_delete_leads BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEAD NOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Note content
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'call_outcome', 'email_response', 'meeting', 'follow_up', 'research')),
  
  -- Authorship
  created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEAD ACTIVITY LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type TEXT NOT NULL,
  -- 'created', 'enriched', 'assigned', 'unassigned', 'contacted', 'note_added', 'tag_added', 'exported'
  description TEXT,
  
  -- Context
  created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEAD INTERACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'sms', 'meeting', 'demo', 'proposal', 'contract')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'scheduled', 'cancelled', 'no_answer', 'voicemail')),
  
  -- Interaction details
  duration INTEGER, -- in seconds
  subject TEXT,
  content TEXT,
  outcome TEXT,
  next_action TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Authorship
  created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CRM PIPELINES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Pipeline settings
  settings JSONB DEFAULT '{
    "allowStageSkipping": true,
    "requireApproval": false,
    "autoAdvance": true,
    "notifications": true
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PIPELINE STAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  pipeline_id UUID REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  color TEXT DEFAULT 'blue',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Stage criteria
  criteria JSONB DEFAULT '[]'::jsonb,
  
  -- Automation rules
  automation_rules JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FOLLOW UP STEPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.follow_up_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  sequence_id UUID REFERENCES public.follow_up_sequences(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  step_number INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('email', 'sms', 'call', 'task', 'wait')),
  subject TEXT,
  content TEXT NOT NULL,
  delay_hours INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Template and attachments
  template_id UUID,
  attachments TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NURTURE CAMPAIGNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.nurture_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Target segments
  target_segments TEXT[] DEFAULT '{}',
  
  -- Campaign sequences (references to follow_up_sequences)
  sequences UUID[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CAMPAIGN PERFORMANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  campaign_id UUID REFERENCES public.nurture_campaigns(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Performance metrics
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  
  -- Calculated rates
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEAD SEGMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  is_active BOOLEAN DEFAULT true,
  
  -- Segment metrics (calculated)
  lead_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  average_value DECIMAL(10,2) DEFAULT 0.00,
  total_value DECIMAL(10,2) DEFAULT 0.00,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SEGMENTATION RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.segmentation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  segment_id UUID REFERENCES public.lead_segments(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Rule conditions
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Target segment
  target_segment TEXT,
  priority INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TARGETING CAMPAIGNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.targeting_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Target segments
  target_segments TEXT[] DEFAULT '{}',
  
  -- Campaign type and content
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('email', 'sms', 'call', 'social', 'retargeting', 'nurture')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Schedule
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ATTRIBUTION MODELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attribution_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  model_type TEXT NOT NULL CHECK (model_type IN ('first_touch', 'last_touch', 'linear', 'time_decay', 'position_based', 'custom')),
  
  -- Model weights
  weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  is_default BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEAD SOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('organic', 'paid', 'social', 'email', 'referral', 'direct', 'other')),
  category TEXT NOT NULL,
  subcategory TEXT,
  
  -- Cost tracking
  cost DECIMAL(10,2) DEFAULT 0.00,
  
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEAD ATTRIBUTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Touchpoints
  touchpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Attribution results
  attribution_score DECIMAL(5,2) DEFAULT 0.00,
  attributed_source TEXT,
  attributed_value DECIMAL(10,2) DEFAULT 0.00,
  
  -- Conversion path
  conversion_path TEXT[] DEFAULT '{}',
  total_touchpoints INTEGER DEFAULT 0,
  days_to_conversion INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);

-- Lead notes indexes
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_business_id ON public.lead_notes(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_by ON public.lead_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_lead_notes_type ON public.lead_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON public.lead_notes(created_at DESC);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_lead_id ON public.lead_activity_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_business_id ON public.lead_activity_log(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON public.lead_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_by ON public.lead_activity_log(created_by);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.lead_activity_log(created_at DESC);

-- Lead interactions indexes
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_business_id ON public.lead_interactions(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_type ON public.lead_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_status ON public.lead_interactions(status);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_created_at ON public.lead_interactions(created_at DESC);

-- Pipeline indexes
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_business_id ON public.crm_pipelines(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_active ON public.crm_pipelines(is_active);
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_default ON public.crm_pipelines(is_default);

-- Pipeline stages indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON public.pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_business_id ON public.pipeline_stages(business_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_position ON public.pipeline_stages(position);

-- Follow up steps indexes
CREATE INDEX IF NOT EXISTS idx_follow_up_steps_sequence_id ON public.follow_up_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_steps_business_id ON public.follow_up_steps(business_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_steps_number ON public.follow_up_steps(step_number);

-- Campaign performance indexes
CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign_id ON public.campaign_performance(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_business_id ON public.campaign_performance(business_id);

-- Lead segments indexes
CREATE INDEX IF NOT EXISTS idx_lead_segments_business_id ON public.lead_segments(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_segments_active ON public.lead_segments(is_active);

-- Segmentation rules indexes
CREATE INDEX IF NOT EXISTS idx_segmentation_rules_segment_id ON public.segmentation_rules(segment_id);
CREATE INDEX IF NOT EXISTS idx_segmentation_rules_business_id ON public.segmentation_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_segmentation_rules_priority ON public.segmentation_rules(priority);

-- Targeting campaigns indexes
CREATE INDEX IF NOT EXISTS idx_targeting_campaigns_business_id ON public.targeting_campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_targeting_campaigns_type ON public.targeting_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_targeting_campaigns_active ON public.targeting_campaigns(is_active);

-- Attribution models indexes
CREATE INDEX IF NOT EXISTS idx_attribution_models_business_id ON public.attribution_models(business_id);
CREATE INDEX IF NOT EXISTS idx_attribution_models_type ON public.attribution_models(model_type);
CREATE INDEX IF NOT EXISTS idx_attribution_models_default ON public.attribution_models(is_default);

-- Lead sources indexes
CREATE INDEX IF NOT EXISTS idx_lead_sources_business_id ON public.lead_sources(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_type ON public.lead_sources(type);
CREATE INDEX IF NOT EXISTS idx_lead_sources_active ON public.lead_sources(is_active);

-- Lead attribution indexes
CREATE INDEX IF NOT EXISTS idx_lead_attribution_lead_id ON public.lead_attribution(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_attribution_business_id ON public.lead_attribution(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_attribution_source ON public.lead_attribution(attributed_source);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_crm_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to all tables with updated_at
CREATE TRIGGER trigger_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_lead_notes_updated_at
  BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_lead_interactions_updated_at
  BEFORE UPDATE ON public.lead_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_crm_pipelines_updated_at
  BEFORE UPDATE ON public.crm_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_follow_up_steps_updated_at
  BEFORE UPDATE ON public.follow_up_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_nurture_campaigns_updated_at
  BEFORE UPDATE ON public.nurture_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_campaign_performance_updated_at
  BEFORE UPDATE ON public.campaign_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_lead_segments_updated_at
  BEFORE UPDATE ON public.lead_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_segmentation_rules_updated_at
  BEFORE UPDATE ON public.segmentation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_targeting_campaigns_updated_at
  BEFORE UPDATE ON public.targeting_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_attribution_models_updated_at
  BEFORE UPDATE ON public.attribution_models
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_lead_sources_updated_at
  BEFORE UPDATE ON public.lead_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_lead_attribution_updated_at
  BEFORE UPDATE ON public.lead_attribution
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_timestamp();

-- ============================================================================
-- RLS POLICIES (Security)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurture_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmentation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targeting_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attribution ENABLE ROW LEVEL SECURITY;

-- Service role can manage all (for API routes)
CREATE POLICY "Service role full access - admin_users"
  ON public.admin_users FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - lead_notes"
  ON public.lead_notes FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - activity_log"
  ON public.lead_activity_log FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - lead_interactions"
  ON public.lead_interactions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - crm_pipelines"
  ON public.crm_pipelines FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - pipeline_stages"
  ON public.pipeline_stages FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - follow_up_steps"
  ON public.follow_up_steps FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - nurture_campaigns"
  ON public.nurture_campaigns FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - campaign_performance"
  ON public.campaign_performance FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - lead_segments"
  ON public.lead_segments FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - segmentation_rules"
  ON public.segmentation_rules FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - targeting_campaigns"
  ON public.targeting_campaigns FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - attribution_models"
  ON public.attribution_models FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - lead_sources"
  ON public.lead_sources FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - lead_attribution"
  ON public.lead_attribution FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert a default admin user
INSERT INTO public.admin_users (id, name, email, role, can_delete_leads)
VALUES (
  gen_random_uuid(),
  'System Admin',
  'admin@cloudgreet.com',
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- Create a default attribution model
INSERT INTO public.attribution_models (business_id, name, description, model_type, weights, is_default)
SELECT 
  id,
  'Last Touch Attribution',
  'Gives 100% credit to the last touchpoint before conversion',
  'last_touch',
  '{"last_touch": 1.0}'::jsonb,
  true
FROM public.businesses 
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.admin_users IS 'Team members who can manage leads and campaigns';
COMMENT ON TABLE public.lead_notes IS 'Notes and comments on leads for team collaboration';
COMMENT ON TABLE public.lead_activity_log IS 'Audit trail of all actions performed on leads';
COMMENT ON TABLE public.lead_interactions IS 'Detailed interaction history for leads';
COMMENT ON TABLE public.crm_pipelines IS 'Sales pipeline management for leads';
COMMENT ON TABLE public.pipeline_stages IS 'Individual stages within sales pipelines';
COMMENT ON TABLE public.follow_up_steps IS 'Individual steps within follow-up sequences';
COMMENT ON TABLE public.nurture_campaigns IS 'Lead nurturing campaign management';
COMMENT ON TABLE public.campaign_performance IS 'Performance metrics for nurture campaigns';
COMMENT ON TABLE public.lead_segments IS 'Lead segmentation for targeted marketing';
COMMENT ON TABLE public.segmentation_rules IS 'Rules for automatic lead segmentation';
COMMENT ON TABLE public.targeting_campaigns IS 'Targeted marketing campaigns';
COMMENT ON TABLE public.attribution_models IS 'Attribution models for lead source tracking';
COMMENT ON TABLE public.lead_sources IS 'Lead source tracking and cost management';
COMMENT ON TABLE public.lead_attribution IS 'Attribution data for leads and conversions';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check if all tables were created successfully
SELECT 
  tablename,
  CASE 
    WHEN tablename IN (
      'admin_users', 'lead_notes', 'lead_activity_log', 'lead_interactions',
      'crm_pipelines', 'pipeline_stages', 'follow_up_steps', 'nurture_campaigns',
      'campaign_performance', 'lead_segments', 'segmentation_rules', 
      'targeting_campaigns', 'attribution_models', 'lead_sources', 'lead_attribution'
    ) THEN '✅ CREATED'
    ELSE '❌ MISSING'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
  'admin_users', 'lead_notes', 'lead_activity_log', 'lead_interactions',
  'crm_pipelines', 'pipeline_stages', 'follow_up_steps', 'nurture_campaigns',
  'campaign_performance', 'lead_segments', 'segmentation_rules', 
  'targeting_campaigns', 'attribution_models', 'lead_sources', 'lead_attribution'
)
ORDER BY tablename;
