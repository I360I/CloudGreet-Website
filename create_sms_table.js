// Create SMS messages table using Supabase client
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function createSMSTable() {
  console.log('🔧 Creating SMS messages table...');
  
  try {
    // First, let's check if the table already exists
    const { data: existingTable, error: checkError } = await supabaseAdmin
      .from('sms_messages')
      .select('id')
      .limit(1);
    
    if (!checkError || !checkError.message.includes('does not exist')) {
      console.log('✅ SMS messages table already exists');
      return;
    }
    
    // Create the table using raw SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS sms_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        from_number VARCHAR(20) NOT NULL,
        to_number VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
        direction VARCHAR(10) DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_sms_messages_business_id ON sms_messages(business_id);
      CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
      CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at);
      
      -- Enable RLS
      ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policies
      CREATE POLICY "Users can view their own SMS messages" ON sms_messages
          FOR SELECT USING (business_id IN (
              SELECT id FROM businesses WHERE owner_id = auth.uid()
          ));
      
      CREATE POLICY "Users can insert their own SMS messages" ON sms_messages
          FOR INSERT WITH CHECK (business_id IN (
              SELECT id FROM businesses WHERE owner_id = auth.uid()
          ));
      
      CREATE POLICY "Users can update their own SMS messages" ON sms_messages
          FOR UPDATE USING (business_id IN (
              SELECT id FROM businesses WHERE owner_id = auth.uid()
          ));
      
      -- Grant permissions
      GRANT ALL ON sms_messages TO authenticated;
      GRANT ALL ON sms_messages TO service_role;
    `;
    
    // Try to execute the SQL using rpc
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: createTableSQL
    });
    
    if (error) {
      console.log('⚠️ Could not create table via RPC. Please run the SQL manually in Supabase dashboard.');
      console.log('SQL to run:', createTableSQL);
      return;
    }
    
    console.log('✅ SMS messages table created successfully');
    
    // Test the table
    const { data: testData, error: testError } = await supabaseAdmin
      .from('sms_messages')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('❌ Error testing table:', testError.message);
    } else {
      console.log('✅ SMS messages table is accessible');
    }
    
  } catch (error) {
    console.error('❌ Error creating SMS messages table:', error.message);
  }
}

createSMSTable();
