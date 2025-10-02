-- SMS System Setup for CloudGreet
-- Run this in your Supabase SQL editor

-- Create SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'received')),
  business_id UUID REFERENCES businesses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('client_booking', 'client_acquisition', 'system_error', 'client_support', 'payment_received', 'payment_failed')),
  message TEXT NOT NULL,
  notification_text TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id),
  client_id UUID REFERENCES users(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  sent_to TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_business_id ON sms_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_from_number ON sms_logs(from_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_to_number ON sms_logs(to_number);

CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable Row Level Security
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sms_logs
CREATE POLICY "Users can view their business SMS logs" ON sms_logs
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all SMS logs" ON sms_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for notifications
CREATE POLICY "Users can view their business notifications" ON notifications
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all notifications" ON notifications
  FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_sms_logs_updated_at 
  BEFORE UPDATE ON sms_logs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert your business phone number into the businesses table
-- Update this with your actual business ID
UPDATE businesses 
SET phone_number = '+17372448305'
WHERE id = (SELECT id FROM businesses LIMIT 1);

-- Add notification settings to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS notification_phone TEXT DEFAULT '+17372960092';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sms_forwarding_enabled BOOLEAN DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS notification_types TEXT[] DEFAULT ARRAY['client_booking', 'client_acquisition', 'system_error', 'client_support', 'payment_received', 'payment_failed'];

-- Update your business with notification settings
UPDATE businesses 
SET 
  notification_phone = '+17372960092',
  sms_forwarding_enabled = true,
  notification_types = ARRAY['client_booking', 'client_acquisition', 'system_error', 'client_support', 'payment_received', 'payment_failed']
WHERE id = (SELECT id FROM businesses LIMIT 1);

COMMIT;
