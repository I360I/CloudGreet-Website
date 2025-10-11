-- Add missing columns to users and ai_agents tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
