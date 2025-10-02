// minimal-db-setup.js
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createMinimalTables() {
  console.log('🚀 Creating minimal database tables...')
  
  try {
    // Test connection first
    console.log('🔍 Testing connection...')
    const { data: testData, error: testError } = await supabase
      .from('_supabase_migrations')
      .select('count')
      .limit(1)
    
    if (testError && !testError.message.includes('relation "_supabase_migrations" does not exist')) {
      console.log('❌ Connection failed:', testError.message)
      return
    }
    
    console.log('✅ Connection successful')
    
    // Create businesses table
    console.log('\n🔍 Creating businesses table...')
    const businessesSQL = `
      CREATE TABLE IF NOT EXISTS businesses (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        business_type VARCHAR(100),
        owner_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        website VARCHAR(255),
        services TEXT[],
        service_areas TEXT[],
        business_hours JSONB,
        greeting_message TEXT,
        ai_tone VARCHAR(50),
        onboarding_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    const { error: businessesError } = await supabase.rpc('exec_sql', { sql: businessesSQL })
    if (businessesError) {
      console.log('❌ Businesses table error:', businessesError.message)
    } else {
      console.log('✅ Businesses table created')
    }
    
    // Create users table
    console.log('\n🔍 Creating users table...')
    const usersSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        business_id UUID REFERENCES businesses(id),
        role VARCHAR(50) DEFAULT 'owner',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    const { error: usersError } = await supabase.rpc('exec_sql', { sql: usersSQL })
    if (usersError) {
      console.log('❌ Users table error:', usersError.message)
    } else {
      console.log('✅ Users table created')
    }
    
    // Create ai_agents table
    console.log('\n🔍 Creating ai_agents table...')
    const agentsSQL = `
      CREATE TABLE IF NOT EXISTS ai_agents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        business_id UUID REFERENCES businesses(id),
        business_name VARCHAR(255),
        business_type VARCHAR(100),
        greeting_message TEXT,
        tone VARCHAR(50),
        services TEXT[],
        service_areas TEXT[],
        business_hours JSONB,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    const { error: agentsError } = await supabase.rpc('exec_sql', { sql: agentsSQL })
    if (agentsError) {
      console.log('❌ AI agents table error:', agentsError.message)
    } else {
      console.log('✅ AI agents table created')
    }
    
    // Create audit_logs table
    console.log('\n🔍 Creating audit_logs table...')
    const auditSQL = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    const { error: auditError } = await supabase.rpc('exec_sql', { sql: auditSQL })
    if (auditError) {
      console.log('❌ Audit logs table error:', auditError.message)
    } else {
      console.log('✅ Audit logs table created')
    }
    
    console.log('\n🏁 Minimal database setup complete!')
    
  } catch (err) {
    console.log('❌ Setup failed:', err.message)
  }
}

createMinimalTables().catch(console.error)
