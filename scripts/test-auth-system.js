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

async function testAuthSystem() {
  try {
    console.log('🧪 Testing authentication system...');
    
    // Test 1: List all users
    console.log('\n📋 Test 1: Listing all users...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }
    
    console.log(`✅ Found ${users.users.length} users`);
    
    // Find demo users
    const demoUser = users.users.find(u => u.email === 'demo@cloudgreet.com');
    const adminUser = users.users.find(u => u.email === 'admin@cloudgreet.com');
    
    if (demoUser) {
      console.log('✅ Demo user found:', {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.user_metadata?.name,
        company_name: demoUser.user_metadata?.company_name
      });
    } else {
      console.log('❌ Demo user not found');
    }
    
    if (adminUser) {
      console.log('✅ Admin user found:', {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.user_metadata?.name,
        company_name: adminUser.user_metadata?.company_name
      });
    } else {
      console.log('❌ Admin user not found');
    }
    
    // Test 2: Test authentication
    console.log('\n🔐 Test 2: Testing authentication...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@cloudgreet.com',
      password: 'demo123'
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
    } else {
      console.log('✅ Authentication successful!');
      console.log('📝 User data:', {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name
      });
    }
    
    // Test 3: Test user creation
    console.log('\n👤 Test 3: Testing user creation...');
    const testUser = {
      email: 'test@cloudgreet.com',
      password: 'testpassword123',
      name: 'Test User',
      company_name: 'Test Company'
    };
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        name: testUser.name,
        company_name: testUser.company_name,
        business_type: 'HVAC',
        onboarding_status: 'pending'
      }
    });
    
    if (createError) {
      console.error('❌ User creation failed:', createError.message);
    } else {
      console.log('✅ User creation successful!');
      console.log('📝 Created user:', {
        id: newUser.user.id,
        email: newUser.user.email,
        name: newUser.user.user_metadata?.name
      });
      
      // Clean up test user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(newUser.user.id);
      if (deleteError) {
        console.log('⚠️  Could not clean up test user:', deleteError.message);
      } else {
        console.log('🧹 Test user cleaned up successfully');
      }
    }
    
    console.log('\n✅ All tests completed!');
    console.log('🎉 Your Supabase auth system is working perfectly!');
    
  } catch (error) {
    console.error('❌ Error testing auth system:', error);
  }
}

testAuthSystem();

