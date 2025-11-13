-- Knowledge base entries per business
CREATE TABLE IF NOT EXISTS business_knowledge_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES custom_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_knowledge_business ON business_knowledge_entries (business_id);
CREATE INDEX IF NOT EXISTS idx_business_knowledge_tags ON business_knowledge_entries USING GIN (tags);

-- QA review table for call scoring
CREATE TABLE IF NOT EXISTS call_quality_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES custom_users(id),
    call_id TEXT,
    call_url TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    highlights TEXT,
    action_items TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_quality_business ON call_quality_reviews (business_id);
CREATE INDEX IF NOT EXISTS idx_call_quality_status ON call_quality_reviews (status);

-- Prompt tuning fields on businesses
ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS ai_confidence_threshold NUMERIC(3,2) DEFAULT 0.60,
    ADD COLUMN IF NOT EXISTS ai_max_silence_seconds INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS ai_escalation_message TEXT DEFAULT 'I''m going to connect you with a teammate who can help further.',
    ADD COLUMN IF NOT EXISTS ai_additional_instructions TEXT DEFAULT NULL;


