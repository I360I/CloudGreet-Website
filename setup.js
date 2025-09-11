#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log('🚀 CloudGreet SaaS Platform Setup');
console.log('===================================\n');

async function setup() {
  try {
    console.log('This script will help you set up the CloudGreet SaaS platform for production.\n');
    console.log('Your clients will sign up for accounts on your platform and get their own dashboards.\n');
    
    // Check if .env.local exists
    const envPath = path.join(process.cwd(), '.env.local');
    const envExists = fs.existsSync(envPath);
    
    if (envExists) {
      console.log('✅ Found existing .env.local file');
      const overwrite = await question('Do you want to overwrite it? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
    }
    
    console.log('\n📋 Please provide the following information:\n');
    
    // Supabase Configuration
    console.log('🗄️  SUPABASE CONFIGURATION');
    const supabaseUrl = await question('Supabase Project URL: ');
    const supabaseAnonKey = await question('Supabase Anon Key: ');
    const supabaseServiceKey = await question('Supabase Service Role Key: ');
    
    // NextAuth Configuration
    console.log('\n🔐 NEXTAUTH CONFIGURATION');
    const nextAuthUrl = await question('NextAuth URL (e.g., https://yourdomain.com): ');
    const nextAuthSecret = await question('NextAuth Secret (32+ characters): ');
    
    // Stripe Configuration
    console.log('\n💳 STRIPE CONFIGURATION');
    const stripeSecretKey = await question('Stripe Secret Key (sk_live_...): ');
    const stripePublishableKey = await question('Stripe Publishable Key (pk_live_...): ');
    const stripeWebhookSecret = await question('Stripe Webhook Secret (whsec_...): ');
    
    // Resend Configuration
    console.log('\n📧 RESEND CONFIGURATION');
    const resendApiKey = await question('Resend API Key (re_...): ');
    
    // Azure Configuration
    console.log('\n🎤 AZURE CONFIGURATION');
    const azureConnectionString = await question('Azure Communication Connection String: ');
    const azureResourceName = await question('Azure Communication Resource Name: ');
    const azureSpeechKey = await question('Azure Speech Key: ');
    const azureSpeechRegion = await question('Azure Speech Region (e.g., eastus): ');
    
    // Google Calendar Configuration
    console.log('\n📅 GOOGLE CALENDAR CONFIGURATION');
    const googleCalendarApiKey = await question('Google Calendar API Key: ');
    const googleClientId = await question('Google Client ID: ');
    const googleClientEmail = await question('Google Service Account Email: ');
    const googleCalendarId = await question('Google Calendar ID: ');
    
    // Optional Integrations
    console.log('\n🔧 OPTIONAL INTEGRATIONS');
    const elevenlabsApiKey = await question('ElevenLabs API Key (optional): ');
    const retellApiKey = await question('Retell API Key (optional): ');
    
    // System Configuration
    console.log('\n⚙️  SYSTEM CONFIGURATION');
    const cronSecret = await question('Cron Secret (for scheduled tasks): ');
    const adminPassword = await question('Admin Password (for admin access): ');
    
    // Generate .env.local content
    const envContent = `# ===========================================
# SUPABASE CONFIGURATION - REQUIRED
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# ===========================================
# NEXTAUTH CONFIGURATION - REQUIRED
# ===========================================
NEXTAUTH_URL=${nextAuthUrl}
NEXTAUTH_SECRET=${nextAuthSecret}

# ===========================================
# STRIPE CONFIGURATION - REQUIRED
# ===========================================
STRIPE_SECRET_KEY=${stripeSecretKey}
STRIPE_PUBLISHABLE_KEY=${stripePublishableKey}
STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret}

# ===========================================
# RESEND EMAIL CONFIGURATION - REQUIRED
# ===========================================
RESEND_API_KEY=${resendApiKey}

# ===========================================
# AZURE CONFIGURATION - REQUIRED
# ===========================================
AZURE_COMMUNICATION_CONNECTION_STRING=${azureConnectionString}
AZURE_COMMUNICATION_RESOURCE_NAME=${azureResourceName}
AZURE_SPEECH_KEY=${azureSpeechKey}
AZURE_SPEECH_REGION=${azureSpeechRegion}

# ===========================================
# GOOGLE CALENDAR CONFIGURATION - REQUIRED
# ===========================================
GOOGLE_CALENDAR_API_KEY=${googleCalendarApiKey}
GOOGLE_CLIENT_ID=${googleClientId}
GOOGLE_CALENDAR_CLIENT_EMAIL=${googleClientEmail}
GOOGLE_CALENDAR_ID=${googleCalendarId}

# ===========================================
# OPTIONAL INTEGRATIONS
# ===========================================
ELEVENLABS_API_KEY=${elevenlabsApiKey}
RETELL_API_KEY=${retellApiKey}

# ===========================================
# SYSTEM CONFIGURATION
# ===========================================
CRON_SECRET=${cronSecret}
ADMIN_PASSWORD=${adminPassword}
`;

    // Write .env.local file
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env.local file created successfully!');
    
    // Create database setup script
    const dbSetupScript = `-- CloudGreet Database Setup Script
-- Run this in your Supabase SQL editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  voice_settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create phone_numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  customer_phone VARCHAR(20),
  customer_name VARCHAR(255),
  duration INTEGER,
  status VARCHAR(20),
  recording_url TEXT,
  transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  service_type VARCHAR(100) NOT NULL,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own agents" ON agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agents" ON agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agents" ON agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own agents" ON agents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own phone numbers" ON phone_numbers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own phone numbers" ON phone_numbers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own phone numbers" ON phone_numbers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own phone numbers" ON phone_numbers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own call logs" ON call_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own call logs" ON call_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own appointments" ON appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appointments" ON appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own appointments" ON appointments FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- Insert sample data (optional)
INSERT INTO users (email, name, password_hash) VALUES 
('admin@cloudgreet.com', 'Admin User', '$2a$10$example.hash.here') 
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON TABLE agents IS 'AI voice agents for each user';
COMMENT ON TABLE phone_numbers IS 'Phone numbers purchased for users';
COMMENT ON TABLE call_logs IS 'Call history and analytics';
COMMENT ON TABLE appointments IS 'Scheduled appointments and bookings';
`;

    fs.writeFileSync('database-setup.sql', dbSetupScript);
    console.log('✅ database-setup.sql file created!');
    
    console.log('\n🎉 Setup Complete!');
    console.log('==================');
    console.log('Next steps:');
    console.log('1. Run the database-setup.sql script in your Supabase SQL editor');
    console.log('2. Test your setup: npm run dev');
    console.log('3. Visit http://localhost:3000 to verify everything works');
    console.log('4. Deploy to production when ready');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setup();
