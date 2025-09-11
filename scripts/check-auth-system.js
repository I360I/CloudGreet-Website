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

async function checkAuthSystem() {
  try {
    console.log('🔍 Checking Supabase auth system...');
    console.log('📍 URL:', supabaseUrl);
    
    // Check if you're using Supabase's built-in auth system
    console.log('🔐 Checking auth.users table (Supabase built-in auth)...');
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Auth users error:', authError.message);
    } else {
      console.log('✅ Found Supabase auth system!');
      console.log(`📊 Found ${authUsers.users.length} users in auth.users`);
      
      if (authUsers.users.length > 0) {
        console.log('📄 Sample auth users:');
        authUsers.users.slice(0, 3).forEach((user, index) => {
          console.log(`User ${index + 1}:`, {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            email_confirmed_at: user.email_confirmed_at
          });
        });
      }
    }
    
    // Try to check if there's a custom users table in a different schema
    console.log('\n🔍 Checking for custom tables in different schemas...');
    
    // Try auth schema
    const { data: authSchemaData, error: authSchemaError } = await supabase
      .from('auth.users')
      .select('*')
      .limit(1);
    
    if (!authSchemaError) {
      console.log('✅ Found auth.users table!');
      console.log('📋 Structure:', Object.keys(authSchemaData[0] || {}));
    } else {
      console.log('❌ auth.users table error:', authSchemaError.message);
    }
    
    // Try to create a test user in the auth system
    console.log('\n🧪 Testing auth user creation...');
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'test@cloudgreet.com',
      password: 'testpassword123',
      email_confirm: true
    });
    
    if (createError) {
      console.log('❌ Create auth user failed:', createError.message);
    } else {
      console.log('✅ Created auth user successfully!');
      console.log('📝 Created user:', {
        id: newUser.user.id,
        email: newUser.user.email,
        created_at: newUser.user.created_at
      });
      
      // Clean up test user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(newUser.user.id);
      
      if (deleteError) {
        console.log('⚠️  Could not clean up test user:', deleteError.message);
      } else {
        console.log('🧹 Test user cleaned up successfully');
      }
    }
    
    // Check if there are any custom tables we can access
    console.log('\n🔍 Checking for accessible tables...');
    
    // Try to get information about the database
    const { data: dbInfo, error: dbError } = await supabase
      .rpc('get_schema_info');
    
    if (dbError) {
      console.log('❌ Cannot get schema info:', dbError.message);
    } else {
      console.log('✅ Database info:', dbInfo);
    }
    
  } catch (error) {
    console.error('❌ Error checking auth system:', error);
  }
}

checkAuthSystem();

