-- EMAIL TEMPLATES AND A/B TESTING TABLES
-- For Apollo Killer email sequence management and optimization

-- ============================================================================
-- EMAIL TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template details
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  
  -- Template configuration
  template_type TEXT DEFAULT 'outreach' CHECK (template_type IN ('outreach', 'follow_up', 'nurture', 'reactivation')),
  business_type TEXT DEFAULT 'all' CHECK (business_type IN ('all', 'HVAC', 'Roofing', 'Painting', 'Plumbing', 'Electrical', 'Landscaping')),
  sequence_position INTEGER DEFAULT 1,
  delay_days INTEGER DEFAULT 0,
  
  -- A/B testing
  is_ab_test BOOLEAN DEFAULT false,
  ab_test_variant TEXT CHECK (ab_test_variant IN ('A', 'B', 'C', 'D')),
  ab_test_weight INTEGER DEFAULT 50 CHECK (ab_test_weight >= 0 AND ab_test_weight <= 100),
  parent_template_id UUID REFERENCES public.email_templates(id),
  
  -- Usage tracking
  send_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  -- Performance metrics
  open_rate DECIMAL(5,2) DEFAULT 0,
  click_rate DECIMAL(5,2) DEFAULT 0,
  reply_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES public.admin_users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- A/B TESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Test details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Templates being tested
  template_a_id UUID REFERENCES public.email_templates(id),
  template_b_id UUID REFERENCES public.email_templates(id),
  
  -- Test configuration
  test_percentage INTEGER DEFAULT 50 CHECK (test_percentage >= 1 AND test_percentage <= 100),
  metric TEXT DEFAULT 'open_rate' CHECK (metric IN ('open_rate', 'click_rate', 'reply_rate', 'conversion_rate')),
  minimum_sample_size INTEGER DEFAULT 100,
  significance_level DECIMAL(3,2) DEFAULT 0.95,
  
  -- Results
  template_a_sends INTEGER DEFAULT 0,
  template_a_opens INTEGER DEFAULT 0,
  template_a_clicks INTEGER DEFAULT 0,
  template_a_replies INTEGER DEFAULT 0,
  
  template_b_sends INTEGER DEFAULT 0,
  template_b_opens INTEGER DEFAULT 0,
  template_b_clicks INTEGER DEFAULT 0,
  template_b_replies INTEGER DEFAULT 0,
  
  -- Statistical significance
  is_statistically_significant BOOLEAN DEFAULT false,
  confidence_interval_lower DECIMAL(5,2),
  confidence_interval_upper DECIMAL(5,2),
  p_value DECIMAL(10,6),
  
  -- Test status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  winner_template_id UUID REFERENCES public.email_templates(id),
  notes TEXT,
  
  -- Metadata
  created_by UUID REFERENCES public.admin_users(id),
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- A/B TEST METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ab_test_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  test_id UUID REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.email_templates(id),
  lead_id UUID REFERENCES public.enriched_leads(id),
  
  -- Metric details
  metric TEXT NOT NULL,
  value DECIMAL(10,4),
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EMAIL SEQUENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sequence details
  name TEXT NOT NULL,
  description TEXT,
  business_type TEXT DEFAULT 'all',
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  total_emails INTEGER DEFAULT 0,
  total_delay_days INTEGER DEFAULT 0,
  
  -- Performance tracking
  total_sends INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_replies INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES public.admin_users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EMAIL SEQUENCE STEPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.email_templates(id),
  
  -- Step configuration
  step_order INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0,
  
  -- Conditions
  condition_type TEXT DEFAULT 'always' CHECK (condition_type IN ('always', 'opened', 'clicked', 'replied', 'not_opened', 'not_clicked')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_business_type ON public.email_templates(business_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_ab_test ON public.email_templates(is_ab_test);

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON public.ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_active ON public.ab_tests(is_active);
CREATE INDEX IF NOT EXISTS idx_ab_tests_template_a ON public.ab_tests(template_a_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_template_b ON public.ab_tests(template_b_id);

CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_test_id ON public.ab_test_metrics(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_template_id ON public.ab_test_metrics(template_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_lead_id ON public.ab_test_metrics(lead_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_recorded_at ON public.ab_test_metrics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_sequences_business_type ON public.email_sequences(business_type);
CREATE INDEX IF NOT EXISTS idx_email_sequences_active ON public.email_sequences(is_active);

CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON public.email_sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_order ON public.email_sequence_steps(step_order);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE TRIGGER trigger_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_timestamp();

CREATE TRIGGER trigger_ab_tests_updated_at
  BEFORE UPDATE ON public.ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_timestamp();

CREATE TRIGGER trigger_email_sequences_updated_at
  BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_timestamp();

-- ============================================================================
-- RLS POLICIES (Security)
-- ============================================================================

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;

-- Service role can manage all
CREATE POLICY "Service role full access - email_templates"
  ON public.email_templates FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - ab_tests"
  ON public.ab_tests FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - ab_test_metrics"
  ON public.ab_test_metrics FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - email_sequences"
  ON public.email_sequences FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - sequence_steps"
  ON public.email_sequence_steps FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================================
-- SAMPLE EMAIL TEMPLATES
-- ============================================================================

-- Insert default templates
INSERT INTO public.email_templates (name, subject, html_content, template_type, business_type, created_by)
VALUES 
(
  'Initial Outreach - HVAC',
  'Quick question about your {{business_name}} HVAC needs',
  '<h2>Hi {{owner_name}},</h2>
  <p>I noticed {{business_name}} doesn''t have an AI receptionist handling calls yet.</p>
  <p>Quick question: How many calls does your team miss each week?</p>
  <p>Most HVAC companies miss 30-40% of their inbound calls, costing them thousands in lost revenue.</p>
  <p>CloudGreet''s AI receptionist answers every call, qualifies leads, and books appointments 24/7.</p>
  <p>Want to see how much revenue you''re losing to missed calls?</p>
  <p><a href="{{demo_link}}">📞 Book a 15-minute demo</a></p>
  <p>Best regards,<br/>The CloudGreet Team</p>',
  'outreach',
  'HVAC',
  (SELECT id FROM public.admin_users LIMIT 1)
),
(
  'Follow-up - Pain Points',
  'Re: {{business_name}} - Are missed calls costing you?',
  '<h2>Hi {{owner_name}},</h2>
  <p>Following up on my message about {{business_name}}.</p>
  <p>I understand you''re busy, but I wanted to share something important:</p>
  <ul>
    <li>Every missed call = lost revenue</li>
    <li>After-hours calls often convert at 60%+ (high intent)</li>
    <li>AI can capture leads 24/7 when you can''t</li>
  </ul>
  <p>CloudGreet has helped {{similar_businesses}} HVAC companies increase their booking rate by 40%.</p>
  <p>Would a 5-minute call work this week?</p>
  <p><a href="{{demo_link}}">Schedule a quick demo</a></p>',
  'follow_up',
  'HVAC',
  (SELECT id FROM public.admin_users LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.email_templates IS 'Email templates for outreach campaigns with A/B testing support';
COMMENT ON TABLE public.ab_tests IS 'A/B tests comparing email template performance';
COMMENT ON TABLE public.ab_test_metrics IS 'Individual metrics recorded for A/B tests';
COMMENT ON TABLE public.email_sequences IS 'Multi-step email sequences for lead nurturing';
COMMENT ON TABLE public.email_sequence_steps IS 'Individual steps in email sequences';

COMMENT ON COLUMN public.email_templates.template_type IS 'Type of email: outreach, follow_up, nurture, reactivation';
COMMENT ON COLUMN public.email_templates.ab_test_variant IS 'A/B test variant: A, B, C, D';
COMMENT ON COLUMN public.ab_tests.metric IS 'Primary metric being tested: open_rate, click_rate, reply_rate, conversion_rate';
COMMENT ON COLUMN public.ab_tests.status IS 'Test status: draft, running, paused, completed, cancelled';
