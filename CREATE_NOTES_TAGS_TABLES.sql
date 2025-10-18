-- NOTES, TAGS, AND ACTIVITY TRACKING TABLES
-- For Apollo Killer lead management and team collaboration

-- ============================================================================
-- ADMIN USERS TABLE (for assignments)
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
-- LEAD NOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  
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
-- LEAD ACTIVITY LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE,
  
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
-- INDEXES for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_by ON public.lead_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_lead_notes_type ON public.lead_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON public.lead_notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_lead_id ON public.lead_activity_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON public.lead_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_by ON public.lead_activity_log(created_by);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.lead_activity_log(created_at DESC);

-- Add index on tags for filtering
CREATE INDEX IF NOT EXISTS idx_enriched_leads_tags ON public.enriched_leads USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_assigned_to ON public.enriched_leads(assigned_to);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_admin_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_timestamp();

CREATE TRIGGER trigger_lead_notes_updated_at
  BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_timestamp();

-- ============================================================================
-- RLS POLICIES (Security)
-- ============================================================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activity_log ENABLE ROW LEVEL SECURITY;

-- Service role can manage all
CREATE POLICY "Service role full access - admin_users"
  ON public.admin_users FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - lead_notes"
  ON public.lead_notes FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - activity_log"
  ON public.lead_activity_log FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================================
-- SAMPLE ADMIN USER (for testing)
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

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.admin_users IS 'Team members who can manage leads and campaigns';
COMMENT ON TABLE public.lead_notes IS 'Notes and comments on leads for team collaboration';
COMMENT ON TABLE public.lead_activity_log IS 'Audit trail of all actions performed on leads';

COMMENT ON COLUMN public.lead_notes.note_type IS 'Category of note: general, call_outcome, email_response, meeting, follow_up, research';
COMMENT ON COLUMN public.lead_activity_log.activity_type IS 'Type of activity: created, enriched, assigned, contacted, etc.';
COMMENT ON COLUMN public.admin_users.role IS 'User role: admin (full access), manager (most access), agent (limited access)';
