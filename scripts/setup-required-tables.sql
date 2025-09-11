-- Setup required tables for dashboard functionality
-- Run this script in your Supabase SQL editor

-- Create analytics table if it doesn't exist
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, date)
);

-- Create call_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    phone_number TEXT,
    status TEXT DEFAULT 'pending',
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create voice_agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS voice_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone_number TEXT,
    status TEXT DEFAULT 'inactive',
    agent_id TEXT, -- Retell AI agent ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analytics table
CREATE POLICY "Users can view their own analytics" ON analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics" ON analytics
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for call_logs table
CREATE POLICY "Users can view their own call logs" ON call_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call logs" ON call_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call logs" ON call_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for voice_agents table
CREATE POLICY "Users can view their own voice agents" ON voice_agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice agents" ON voice_agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice agents" ON voice_agents
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_agents_user_id ON voice_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_agents_status ON voice_agents(status);

-- Insert some sample data for testing (optional)
-- You can remove this section if you don't want sample data
INSERT INTO analytics (user_id, date, total_calls, successful_calls, revenue)
SELECT 
    auth.uid(),
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29),
    FLOOR(RANDOM() * 20) + 1,
    FLOOR(RANDOM() * 15) + 1,
    FLOOR(RANDOM() * 1000) + 100
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, date) DO NOTHING;

-- Insert sample call logs
INSERT INTO call_logs (user_id, phone_number, status, duration)
SELECT 
    auth.uid(),
    '+1-555-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    CASE FLOOR(RANDOM() * 3)
        WHEN 0 THEN 'completed'
        WHEN 1 THEN 'missed'
        ELSE 'pending'
    END,
    FLOOR(RANDOM() * 300) + 30
WHERE auth.uid() IS NOT NULL
LIMIT 10;

-- Insert sample voice agent
INSERT INTO voice_agents (user_id, name, phone_number, status)
SELECT 
    auth.uid(),
    'Main AI Agent',
    '+1-555-0123',
    'active'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;
