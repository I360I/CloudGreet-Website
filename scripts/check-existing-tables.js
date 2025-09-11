const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkExistingTables() {
  try {
    console.log('🔍 Checking existing tables in your Supabase database...');
    console.log('📍 URL:', supabaseUrl);
    
    // Try to query the users table to see if it exists and what structure it has
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
      
      // Try to get table information from information_schema
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_info');
      
      if (tablesError) {
        console.log('💡 Let me try a different approach to see your tables...');
        
        // Try common table names
        const commonTables = ['users', 'user', 'accounts', 'profiles', 'auth_users'];
        
        for (const tableName of commonTables) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!error) {
            console.log(`✅ Found table: ${tableName}`);
            if (data && data.length > 0) {
              console.log(`📋 Sample data structure:`, Object.keys(data[0]));
            }
          }
        }
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
            name: user.name,
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

checkExistingTables();

