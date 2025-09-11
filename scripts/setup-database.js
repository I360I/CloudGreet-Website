const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...')
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_create_users_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Execute migration
    console.log('📝 Running migration...')
    const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (migrationError) {
      console.error('❌ Migration failed:', migrationError)
      return
    }
    
    console.log('✅ Migration completed successfully')
    
    // Read seed file
    const seedPath = path.join(__dirname, '../supabase/seed.sql')
    const seedSQL = fs.readFileSync(seedPath, 'utf8')
    
    // Execute seed data
    console.log('🌱 Seeding database...')
    const { error: seedError } = await supabase.rpc('exec_sql', { sql: seedSQL })
    
    if (seedError) {
      console.error('❌ Seeding failed:', seedError)
      return
    }
    
    console.log('✅ Database setup completed successfully!')
    console.log('📊 Test user created: test@cloudgreet.com (password: password123)')
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
  }
}

// Check if we can connect to Supabase
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) {
      console.log('⚠️  Database not accessible, but setup will continue...')
    } else {
      console.log('✅ Database connection successful')
    }
  } catch (error) {
    console.log('⚠️  Database connection test failed, but setup will continue...')
  }
}

async function main() {
  await testConnection()
  await setupDatabase()
}

main()