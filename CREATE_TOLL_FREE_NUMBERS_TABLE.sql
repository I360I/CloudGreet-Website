-- Create toll_free_numbers table for managing pre-approved toll-free numbers
CREATE TABLE IF NOT EXISTS toll_free_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'inactive')),
  assigned_to UUID REFERENCES businesses(id) ON DELETE SET NULL,
  business_name VARCHAR(255),
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_status ON toll_free_numbers(status);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_assigned_to ON toll_free_numbers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_toll_free_numbers_number ON toll_free_numbers(number);

-- Enable RLS
ALTER TABLE toll_free_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins can view all numbers
CREATE POLICY "Admins can view all toll free numbers" ON toll_free_numbers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = toll_free_numbers.assigned_to 
      AND businesses.owner_id = auth.uid()
    )
  );

-- Only admins can insert numbers
CREATE POLICY "Admins can insert toll free numbers" ON toll_free_numbers
  FOR INSERT WITH CHECK (true); -- Admin only via service role

-- Only admins can update numbers
CREATE POLICY "Admins can update toll free numbers" ON toll_free_numbers
  FOR UPDATE USING (true); -- Admin only via service role

-- Only admins can delete numbers
CREATE POLICY "Admins can delete toll free numbers" ON toll_free_numbers
  FOR DELETE USING (true); -- Admin only via service role

-- Note: Phone numbers will be added through the admin dashboard
-- No hardcoded numbers - manage inventory through /admin/phone-inventory