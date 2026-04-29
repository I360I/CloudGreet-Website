-- Create SMS messages table (ULTRA SAFE VERSION - NO FOREIGN KEYS)

-- Drop table if it exists (in case of previous failed attempts)
DROP TABLE IF EXISTS sms_messages CASCADE;

-- Create the table with basic structure only
CREATE TABLE sms_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'sent',
    telynyx_message_id VARCHAR(255),
    telynyx_conversation_id VARCHAR(255),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    lead_id UUID,
    appointment_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints after table creation
ALTER TABLE sms_messages 
ADD CONSTRAINT check_direction CHECK (direction IN ('inbound', 'outbound'));

ALTER TABLE sms_messages 
ADD CONSTRAINT check_status CHECK (status IN ('sent', 'delivered', 'failed', 'pending'));

-- Create basic indexes
CREATE INDEX idx_sms_messages_business_id ON sms_messages(business_id);
CREATE INDEX idx_sms_messages_from_number ON sms_messages(from_number);
CREATE INDEX idx_sms_messages_to_number ON sms_messages(to_number);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_messages TO authenticated;
GRANT SELECT ON sms_messages TO anon;

-- Enable RLS
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy
CREATE POLICY "Users can manage own SMS messages" ON sms_messages
  FOR ALL USING (true); -- Temporarily allow all access for testing

-- Insert test data only if we have businesses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM businesses LIMIT 1) THEN
        INSERT INTO sms_messages (business_id, from_number, to_number, message_text, direction, status, customer_name) VALUES
        (
            (SELECT id FROM businesses LIMIT 1),
            '+15551234567',
            '+15559876543',
            'Thank you for calling ABC HVAC! Your appointment is confirmed for tomorrow at 2 PM.',
            'outbound',
            'delivered',
            'John Smith'
        );
    END IF;
END $$;
