-- APOLLO KILLER: Lead Enrichment & Outreach System Database Schema
-- This enables FREE unlimited lead enrichment vs Apollo's $99-499/month

-- ============================================================================
-- ENRICHED LEADS TABLE (Main Storage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.enriched_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic business info (from Google Places)
  business_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  website TEXT,
  google_place_id TEXT UNIQUE,
  
  -- Business classification
  business_type TEXT, -- 'HVAC', 'Roofing', 'Painting'
  industry_category TEXT,
  
  -- ENRICHED owner/decision maker data (THE GOLD!)
  owner_name TEXT,
  owner_title TEXT,
  owner_email TEXT,
  owner_email_verified BOOLEAN DEFAULT false,
  owner_email_confidence INTEGER, -- 0-100
  owner_phone TEXT,
  owner_phone_type TEXT, -- 'mobile', 'landline', 'voip'
  owner_linkedin_url TEXT,
  owner_linkedin_verified BOOLEAN DEFAULT false,
  
  -- Additional decision makers
  decision_makers JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{name, title, email, email_verified, phone, linkedin}]
  
  -- Business intelligence (estimated/scraped)
  estimated_revenue_min INTEGER,
  estimated_revenue_max INTEGER,
  employee_count_min INTEGER,
  employee_count_max INTEGER,
  years_in_business INTEGER,
  annual_call_volume INTEGER,
  
  -- Online presence
  google_rating DECIMAL(2,1),
  google_review_count INTEGER,
  website_quality_score INTEGER, -- 0-100
  has_online_booking BOOLEAN DEFAULT false,
  has_live_chat BOOLEAN DEFAULT false,
  has_ai_receptionist BOOLEAN DEFAULT false,
  
  -- Tech stack detected
  detected_technologies JSONB DEFAULT '[]'::jsonb,
  -- ['WordPress', 'Google Analytics', 'Facebook Pixel', etc.]
  
  -- Pain points detected (AI-analyzed from website)
  pain_points JSONB DEFAULT '[]'::jsonb,
  -- ['Missed calls mentioned', 'Hiring receptionist', 'After-hours issues']
  
  -- LEAD SCORING (0-100 for each category)
  total_score INTEGER DEFAULT 0,
  fit_score INTEGER DEFAULT 0, -- How well they match ideal customer
  engagement_score INTEGER DEFAULT 0, -- Online presence quality
  contact_quality_score INTEGER DEFAULT 0, -- How good is contact data
  opportunity_score INTEGER DEFAULT 0, -- Pain points + buying signals
  urgency_score INTEGER DEFAULT 0, -- How urgently they need solution
  
  -- AI-generated personalization
  personalized_pitch TEXT, -- Custom pitch for THIS business
  recommended_approach TEXT, -- 'email_first', 'call_direct', 'linkedin_message'
  best_contact_time TEXT, -- Based on business hours/industry
  objections_anticipated JSONB DEFAULT '[]'::jsonb,
  
  -- Enrichment metadata
  enrichment_status TEXT DEFAULT 'pending',
  -- 'pending', 'in_progress', 'enriched', 'failed', 'partial'
  enrichment_sources JSONB DEFAULT '[]'::jsonb,
  -- ['google_places', 'website_scrape', 'linkedin', 'email_verification']
  last_enriched_at TIMESTAMPTZ,
  enrichment_attempts INTEGER DEFAULT 0,
  enrichment_errors JSONB DEFAULT '[]'::jsonb,
  
  -- Outreach tracking
  outreach_status TEXT DEFAULT 'not_contacted',
  -- 'not_contacted', 'queued', 'contacted', 'responded', 'converted', 'not_interested'
  campaign_id UUID,
  first_contact_date TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,
  contact_attempts INTEGER DEFAULT 0,
  
  -- Email engagement
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  email_responded BOOLEAN DEFAULT false,
  last_email_sent_at TIMESTAMPTZ,
  last_email_opened_at TIMESTAMPTZ,
  
  -- Call tracking
  calls_attempted INTEGER DEFAULT 0,
  calls_connected INTEGER DEFAULT 0,
  last_call_at TIMESTAMPTZ,
  call_outcome TEXT,
  
  -- SMS tracking
  sms_sent INTEGER DEFAULT 0,
  sms_responded BOOLEAN DEFAULT false,
  last_sms_sent_at TIMESTAMPTZ,
  
  -- Conversion tracking
  became_client BOOLEAN DEFAULT false,
  conversion_date TIMESTAMPTZ,
  lifetime_value INTEGER,
  
  -- Notes & tags
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Admin assignment
  assigned_to UUID, -- Admin user handling this lead
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_enrichment_status CHECK (
    enrichment_status IN ('pending', 'in_progress', 'enriched', 'failed', 'partial')
  ),
  CONSTRAINT valid_outreach_status CHECK (
    outreach_status IN ('not_contacted', 'queued', 'contacted', 'responded', 'converted', 'not_interested', 'do_not_contact')
  ),
  CONSTRAINT valid_priority CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  CONSTRAINT valid_scores CHECK (
    total_score >= 0 AND total_score <= 100 AND
    fit_score >= 0 AND fit_score <= 100 AND
    engagement_score >= 0 AND engagement_score <= 100 AND
    contact_quality_score >= 0 AND contact_quality_score <= 100 AND
    opportunity_score >= 0 AND opportunity_score <= 100
  )
);

-- ============================================================================
-- OUTREACH CAMPAIGNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Campaign settings
  campaign_type TEXT DEFAULT 'email', -- 'email', 'sms', 'call', 'multi_channel'
  target_business_type TEXT, -- 'HVAC', 'Roofing', 'Painting'
  target_location TEXT,
  min_score INTEGER DEFAULT 70, -- Only contact leads with score >= this
  
  -- Email sequence (if campaign_type = 'email')
  email_sequence JSONB DEFAULT '[]'::jsonb,
  -- [{day: 0, subject: '...', template: '...'}, {day: 3, ...}]
  
  -- SMS sequence
  sms_sequence JSONB DEFAULT '[]'::jsonb,
  
  -- Campaign stats
  total_leads INTEGER DEFAULT 0,
  contacted INTEGER DEFAULT 0,
  responded INTEGER DEFAULT 0,
  converted INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  
  -- Scheduling
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- Admin user
  
  CONSTRAINT valid_campaign_type CHECK (
    campaign_type IN ('email', 'sms', 'call', 'multi_channel')
  ),
  CONSTRAINT valid_campaign_status CHECK (
    status IN ('draft', 'active', 'paused', 'completed')
  )
);

-- ============================================================================
-- CAMPAIGN CONTACTS (Join table for leads in campaigns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  campaign_id UUID REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  
  -- Contact status for THIS campaign
  status TEXT DEFAULT 'queued',
  -- 'queued', 'contacted', 'responded', 'converted', 'bounced', 'unsubscribed'
  
  -- Engagement tracking
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  
  calls_made INTEGER DEFAULT 0,
  calls_connected INTEGER DEFAULT 0,
  
  sms_sent INTEGER DEFAULT 0,
  sms_replied BOOLEAN DEFAULT false,
  
  -- Timestamps
  first_contacted_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(campaign_id, lead_id)
);

-- ============================================================================
-- ENRICHMENT QUEUE (Processing pipeline)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  
  -- What needs to be enriched
  enrichment_tasks JSONB DEFAULT '[]'::jsonb,
  -- ['website_scrape', 'email_verification', 'linkedin_search', 'ai_analysis']
  
  -- Processing status
  status TEXT DEFAULT 'queued',
  -- 'queued', 'processing', 'completed', 'failed'
  
  priority INTEGER DEFAULT 5, -- 1 (low) to 10 (urgent)
  
  -- Processing metadata
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_queue_status CHECK (
    status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')
  )
);

-- ============================================================================
-- CONTACT VERIFICATION LOG (Track verification attempts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  
  contact_type TEXT NOT NULL, -- 'email', 'phone', 'website'
  contact_value TEXT NOT NULL,
  
  -- Verification result
  is_valid BOOLEAN,
  confidence_score INTEGER, -- 0-100
  verification_method TEXT,
  -- 'smtp_check', 'api_verification', 'pattern_match', 'manual'
  
  -- Details
  verification_details JSONB,
  error_message TEXT,
  
  -- Timestamps
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_verifications_lead_id (lead_id),
  INDEX idx_verifications_type (contact_type)
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_enriched_leads_business_type ON public.enriched_leads(business_type);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_location ON public.enriched_leads(city, state);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_score ON public.enriched_leads(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_status ON public.enriched_leads(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_outreach ON public.enriched_leads(outreach_status);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_created ON public.enriched_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_google_place ON public.enriched_leads(google_place_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.outreach_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON public.outreach_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON public.outreach_campaigns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign ON public.campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_lead ON public.campaign_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON public.campaign_contacts(status);

CREATE INDEX IF NOT EXISTS idx_enrichment_queue_status ON public.enrichment_queue(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_priority ON public.enrichment_queue(priority DESC);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_enriched_leads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enriched_leads_updated_at
  BEFORE UPDATE ON public.enriched_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_enriched_leads_timestamp();

CREATE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON public.outreach_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_enriched_leads_timestamp();

CREATE TRIGGER trigger_campaign_contacts_updated_at
  BEFORE UPDATE ON public.campaign_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_enriched_leads_timestamp();

-- ============================================================================
-- RLS POLICIES (Security)
-- ============================================================================

ALTER TABLE public.enriched_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_verifications ENABLE ROW LEVEL SECURITY;

-- Service role can manage all (for API routes)
CREATE POLICY "Service role full access - enriched_leads"
  ON public.enriched_leads FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - campaigns"
  ON public.outreach_campaigns FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - campaign_contacts"
  ON public.campaign_contacts FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - enrichment_queue"
  ON public.enrichment_queue FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - verifications"
  ON public.contact_verifications FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================================
-- HELPFUL COMMENTS
-- ============================================================================

COMMENT ON TABLE public.enriched_leads IS 'Apollo-killer: Enriched business leads with owner contact data, AI scoring, and outreach tracking';
COMMENT ON COLUMN public.enriched_leads.owner_email IS 'Direct owner/decision maker email - THE MOST VALUABLE DATA';
COMMENT ON COLUMN public.enriched_leads.total_score IS 'AI-calculated lead quality score 0-100 (95+ = perfect fit)';
COMMENT ON COLUMN public.enriched_leads.personalized_pitch IS 'AI-generated custom pitch based on detected pain points';
COMMENT ON TABLE public.outreach_campaigns IS 'Multi-channel outreach campaigns (email/SMS/calls) with sequences';
COMMENT ON TABLE public.enrichment_queue IS 'Background job queue for processing lead enrichment tasks';

-- ============================================================================
-- SAMPLE DATA STRUCTURE (For reference)
-- ============================================================================

/*
Example enriched lead after full processing:

{
  business_name: "Premier HVAC Services",
  owner_name: "John Smith",
  owner_title: "Owner & CEO",
  owner_email: "john.smith@premierhvac.com",
  owner_email_verified: true,
  owner_email_confidence: 95,
  owner_phone: "(214) 555-0123",
  owner_phone_type: "mobile",
  owner_linkedin_url: "linkedin.com/in/johnsmith-hvac",
  
  decision_makers: [
    {
      name: "Sarah Johnson",
      title: "Operations Manager",
      email: "sarah@premierhvac.com",
      phone: "(214) 555-0124"
    }
  ],
  
  estimated_revenue_min: 500000,
  estimated_revenue_max: 1000000,
  employee_count_min: 5,
  employee_count_max: 10,
  
  pain_points: [
    "Mentions 'missed calls' 3x on website",
    "No after-hours service listed",
    "Competitor review mentions better availability"
  ],
  
  total_score: 95,
  fit_score: 98,
  engagement_score: 92,
  contact_quality_score: 96,
  opportunity_score: 94,
  
  personalized_pitch: "Hi John - Premier HVAC's 4.8★ rating shows you do great work. 
    But I noticed you mention missed calls on your site. Based on your 234 reviews and 
    Dallas location, you're probably missing 12-15 calls/month = $18,000 in lost revenue. 
    CloudGreet's AI receptionist answers 24/7 for $299/month..."
}
*/

