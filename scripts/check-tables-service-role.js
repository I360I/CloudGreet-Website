const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTablesWithServiceRole() {
  try {
    console.log('🔍 Checking tables with service role key (bypasses RLS)...');
    console.log('📍 URL:', supabaseUrl);
    
    // Try to query the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
      
      // The error suggests the table exists but has different column names
      // Let's try to get the table schema information
      console.log('💡 Let me try to get table schema information...');
      
      // Try to query with a wildcard to see what columns exist
      const { data: anyData, error: anyError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (anyError) {
        console.log('❌ Cannot access users table at all:', anyError.message);
        
        // Try to list all tables in the public schema
        console.log('🔍 Trying to list all tables...');
        
        // Try common table names that might exist
        const commonTables = ['user', 'accounts', 'profiles', 'auth_users', 'customers', 'clients'];
        
        for (const tableName of commonTables) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!error && data) {
            console.log(`✅ Found table: ${tableName}`);
            console.log(`📋 Structure:`, Object.keys(data[0] || {}));
          } else if (error && !error.message.includes('permission denied')) {
            console.log(`❌ Table ${tableName} error:`, error.message);
          }
        }
      } else {
        console.log('✅ Found users table with data!');
        console.log('📋 Structure:', Object.keys(anyData[0] || {}));
        console.log('📄 Sample data:', anyData[0]);
      }
    } else {
      console.log('✅ Users table exists and is accessible!');
      console.log(`📊 Found ${users.length} users`);
      
      if (users.length > 0) {
        console.log('📋 Table structure:');
        console.log(Object.keys(users[0]));
        console.log('📄 Sample user data:');
        users.forEach((user, index) => {
          console.log(`User ${index + 1}:`, {
            id: user.id,
            email: user.email,
            name: user.name || user.full_name || user.username,
            created_at: user.created_at
          });
        });
      }
    }
    
    // Try to insert a test user to verify write access
    console.log('\n🧪 Testing user creation...');
    const testUser = {
      email: 'test@cloudgreet.com',
      password_hash: '$2b$10$test.hash.for.testing.purposes.only',
      name: 'Test User'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert(testUser)
      .select();
    
    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
      console.log('💡 This suggests the table structure is different than expected');
    } else {
      console.log('✅ Insert test successful!');
      console.log('📝 Created test user:', insertData[0]);
      
      // Clean up test user
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('email', 'test@cloudgreet.com');
      
      if (deleteError) {
        console.log('⚠️  Could not clean up test user:', deleteError.message);
      } else {
        console.log('🧹 Test user cleaned up successfully');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
}

checkTablesWithServiceRole();

