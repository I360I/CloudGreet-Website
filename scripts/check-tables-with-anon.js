const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xpyrovyhktapbvzdxaho.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweXJvdnloa3RhcGJ2emR4YWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMDQwODAsImV4cCI6MjA3MTU4MDA4MH0.4q__sWRpIZwexqIrW4mKPEZGb89tIqQCmb7GMiijn6Q';

const supabase = createClient(supabaseUrl, anonKey);

async function checkTablesWithAnon() {
  try {
    console.log('🔍 Checking tables with anon key...');
    console.log('📍 URL:', supabaseUrl);
    
    // Try to query the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
      console.log('💡 This might be a permissions issue or the table has a different structure');
      
      // Try to get any data from the table to see the structure
      const { data: anyData, error: anyError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (anyError) {
        console.log('❌ Cannot access users table:', anyError.message);
        
        // Try other common table names
        const commonTables = ['user', 'accounts', 'profiles', 'auth_users', 'customers'];
        
        for (const tableName of commonTables) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!error && data) {
            console.log(`✅ Found table: ${tableName}`);
            console.log(`📋 Structure:`, Object.keys(data[0] || {}));
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
      console.log('💡 This might be due to RLS (Row Level Security) policies');
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

checkTablesWithAnon();

