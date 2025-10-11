-- =====================================================
-- TOLL-FREE NUMBERS DATABASE SETUP
-- This creates the tables needed for toll-free number management
-- =====================================================

-- Create toll_free_numbers table
CREATE TABLE IF NOT EXISTS toll_free_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'suspended')),
    assigned_to UUID REFERENCES businesses(id) ON DELETE SET NULL,
    business_name VARCHAR(255),
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_status ON toll_free_numbers(status);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_assigned_to ON toll_free_numbers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_number ON toll_free_numbers(number);

-- Create sms_templates table for client-specific templates
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    template TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for sms_templates
CREATE INDEX IF NOT EXISTS idx_sms_templates_business_id ON sms_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_type ON sms_templates(type);

-- Add RLS policies
ALTER TABLE toll_free_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

-- Policies for toll_free_numbers
CREATE POLICY "Admin can manage toll-free numbers" ON toll_free_numbers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Business owners can view their assigned numbers" ON toll_free_numbers
    FOR SELECT USING (
        assigned_to IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Policies for sms_templates
CREATE POLICY "Business owners can manage their SMS templates" ON sms_templates
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Admin can manage all SMS templates" ON sms_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON toll_free_numbers TO authenticated;
GRANT ALL ON sms_templates TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_toll_free_numbers_updated_at 
    BEFORE UPDATE ON toll_free_numbers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_templates_updated_at 
    BEFORE UPDATE ON sms_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample toll-free numbers (replace with your actual numbers)
INSERT INTO toll_free_numbers (number, status) VALUES
('+18005551234', 'available'),
('+18005551235', 'available'),
('+18005551236', 'available'),
('+18005551237', 'available'),
('+18005551238', 'available'),
('+18005551239', 'available'),
('+18005551240', 'available'),
('+18005551241', 'available'),
('+18005551242', 'available'),
('+18005551243', 'available')
ON CONFLICT (number) DO NOTHING;

-- Verify the setup
SELECT 'Toll-free numbers table created successfully' as status;
SELECT COUNT(*) as available_numbers FROM toll_free_numbers WHERE status = 'available';
SELECT 'SMS templates table created successfully' as status;
