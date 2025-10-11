-- Call Conversation Tables for AI Voice Receptionist
-- These tables store the actual voice conversations between AI and customers

-- Table to store call conversation sessions
CREATE TABLE IF NOT EXISTS call_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL UNIQUE,
    call_id TEXT NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    caller_phone TEXT NOT NULL,
    business_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, completed, failed
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store individual conversation exchanges
CREATE TABLE IF NOT EXISTS conversation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_message TEXT,
    ai_response TEXT NOT NULL,
    message_type TEXT DEFAULT 'voice', -- voice, sms, web
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_conversations_business_id ON call_conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_call_conversations_conversation_id ON call_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_conversations_call_id ON call_conversations(call_id);
CREATE INDEX IF NOT EXISTS idx_call_conversations_started_at ON call_conversations(started_at);

CREATE INDEX IF NOT EXISTS idx_conversation_history_conversation_id ON conversation_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_business_id ON conversation_history(business_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON conversation_history(created_at);

-- Add RLS policies
ALTER TABLE call_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- RLS policy for call_conversations
CREATE POLICY "Users can view their own business call conversations" ON call_conversations
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id::text = (auth.jwt() ->> 'sub')
        )
    );

CREATE POLICY "Users can insert call conversations for their business" ON call_conversations
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id::text = (auth.jwt() ->> 'sub')
        )
    );

CREATE POLICY "Users can update call conversations for their business" ON call_conversations
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id::text = (auth.jwt() ->> 'sub')
        )
    );

-- RLS policy for conversation_history
CREATE POLICY "Users can view conversation history for their business" ON conversation_history
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id::text = (auth.jwt() ->> 'sub')
        )
    );

CREATE POLICY "Users can insert conversation history for their business" ON conversation_history
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id::text = (auth.jwt() ->> 'sub')
        )
    );

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_call_conversations_updated_at 
    BEFORE UPDATE ON call_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON call_conversations TO authenticated;
GRANT ALL ON conversation_history TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
