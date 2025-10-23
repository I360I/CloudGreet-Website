-- ===========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================
-- These policies ensure proper tenant isolation and data security

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- BUSINESSES TABLE POLICIES
-- ===========================================

-- Users can only see their own business
CREATE POLICY "Users can view own business" ON businesses
    FOR SELECT USING (auth.uid() = owner_id);

-- Users can update their own business
CREATE POLICY "Users can update own business" ON businesses
    FOR UPDATE USING (auth.uid() = owner_id);

-- Users can insert their own business
CREATE POLICY "Users can insert own business" ON businesses
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- ===========================================
-- CALLS TABLE POLICIES
-- ===========================================

-- Users can only see calls for their business
CREATE POLICY "Users can view own business calls" ON calls
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can insert calls for their business
CREATE POLICY "Users can insert calls for own business" ON calls
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can update calls for their business
CREATE POLICY "Users can update own business calls" ON calls
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- ===========================================
-- APPOINTMENTS TABLE POLICIES
-- ===========================================

-- Users can only see appointments for their business
CREATE POLICY "Users can view own business appointments" ON appointments
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can insert appointments for their business
CREATE POLICY "Users can insert appointments for own business" ON appointments
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can update appointments for their business
CREATE POLICY "Users can update own business appointments" ON appointments
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can delete appointments for their business
CREATE POLICY "Users can delete own business appointments" ON appointments
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- ===========================================
-- LEADS TABLE POLICIES
-- ===========================================

-- Users can only see leads for their business
CREATE POLICY "Users can view own business leads" ON leads
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can insert leads for their business
CREATE POLICY "Users can insert leads for own business" ON leads
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can update leads for their business
CREATE POLICY "Users can update own business leads" ON leads
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- ===========================================
-- AI AGENTS TABLE POLICIES
-- ===========================================

-- Users can only see AI agents for their business
CREATE POLICY "Users can view own business AI agents" ON ai_agents
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can insert AI agents for their business
CREATE POLICY "Users can insert AI agents for own business" ON ai_agents
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can update AI agents for their business
CREATE POLICY "Users can update own business AI agents" ON ai_agents
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- ===========================================
-- PHONE NUMBERS TABLE POLICIES
-- ===========================================

-- Users can only see phone numbers for their business
CREATE POLICY "Users can view own business phone numbers" ON phone_numbers
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can insert phone numbers for their business
CREATE POLICY "Users can insert phone numbers for own business" ON phone_numbers
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can update phone numbers for their business
CREATE POLICY "Users can update own business phone numbers" ON phone_numbers
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- ===========================================
-- BILLING HISTORY TABLE POLICIES
-- ===========================================

-- Users can only see billing history for their business
CREATE POLICY "Users can view own business billing" ON billing_history
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can insert billing history for their business
CREATE POLICY "Users can insert billing for own business" ON billing_history
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- ===========================================
-- SUBSCRIPTION EVENTS TABLE POLICIES
-- ===========================================

-- Users can only see subscription events for their business
CREATE POLICY "Users can view own business subscription events" ON subscription_events
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can insert subscription events for their business
CREATE POLICY "Users can insert subscription events for own business" ON subscription_events
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- ===========================================
-- CONTACT SUBMISSIONS TABLE POLICIES
-- ===========================================

-- Contact submissions are public (no business_id filter needed)
CREATE POLICY "Anyone can view contact submissions" ON contact_submissions
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert contact submissions" ON contact_submissions
    FOR INSERT WITH CHECK (true);

-- ===========================================
-- AUDIT TRAIL TABLE POLICIES
-- ===========================================

-- Users can only see audit trail for their business
CREATE POLICY "Users can view own business audit trail" ON audit_trail
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Users can insert audit trail for their business
CREATE POLICY "Users can insert audit trail for own business" ON audit_trail
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- ===========================================
-- SERVICE ROLE BYPASS POLICIES
-- ===========================================
-- These allow the service role to bypass RLS for admin operations

-- Service role can access all data (for admin operations)
CREATE POLICY "Service role can access all businesses" ON businesses
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all calls" ON calls
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all appointments" ON appointments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all AI agents" ON ai_agents
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all phone numbers" ON phone_numbers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all billing" ON billing_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all subscription events" ON subscription_events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all contact submissions" ON contact_submissions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all audit trail" ON audit_trail
    FOR ALL USING (auth.role() = 'service_role');

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
