const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🚀 Setting up CloudGreet database schema...')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
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
    console.log('📋 Creating database tables...')
    
    // Create users table with proper schema
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) DEFAULT '',
        business_type VARCHAR(100) DEFAULT 'HVAC',
        phone_number VARCHAR(20) DEFAULT '',
        onboarding_status VARCHAR(50) DEFAULT 'pending',
        retell_agent_id VARCHAR(255),
        retell_phone_number VARCHAR(20),
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Create customers table
    const createCustomersTable = `
      CREATE TABLE IF NOT EXISTS customers (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Create calls table
    const createCallsTable = `
      CREATE TABLE IF NOT EXISTS calls (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        call_id VARCHAR(255) UNIQUE,
        phone_number VARCHAR(20),
        duration INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'completed',
        transcript TEXT,
        recording_url TEXT,
        satisfaction_score INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Create appointments table
    const createAppointmentsTable = `
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        service_type VARCHAR(100),
        price DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Create notifications table
    const createNotificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Execute table creation
    const tables = [
      { name: 'users', sql: createUsersTable },
      { name: 'customers', sql: createCustomersTable },
      { name: 'calls', sql: createCallsTable },
      { name: 'appointments', sql: createAppointmentsTable },
      { name: 'notifications', sql: createNotificationsTable }
    ]

    for (const table of tables) {
      console.log(`📝 Creating ${table.name} table...`)
      
      // Try to create the table
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql })
      
      if (error) {
        console.log(`⚠️ Could not create ${table.name} table via RPC:`, error.message)
        
        // Try to check if table already exists
        const { data: existingData, error: checkError } = await supabase
          .from(table.name)
          .select('*')
          .limit(1)
        
        if (checkError) {
          console.log(`❌ ${table.name} table does not exist and cannot be created automatically`)
          console.log(`💡 Please create the ${table.name} table manually in the Supabase dashboard`)
          console.log(`SQL: ${table.sql}`)
        } else {
          console.log(`✅ ${table.name} table already exists`)
        }
      } else {
        console.log(`✅ ${table.name} table created successfully`)
      }
    }

    // Create indexes for better performance
    console.log('📊 Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);'
    ]

    for (const indexSQL of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSQL })
      if (error) {
        console.log(`⚠️ Could not create index: ${error.message}`)
      }
    }

    console.log('🎉 Database setup completed!')
    console.log('📋 Next steps:')
    console.log('1. If any tables failed to create, create them manually in Supabase dashboard')
    console.log('2. Test the registration API')
    console.log('3. Test the onboarding flow')

  } catch (error) {
    console.error('❌ Database setup failed:', error)
  }
}

setupDatabase()
