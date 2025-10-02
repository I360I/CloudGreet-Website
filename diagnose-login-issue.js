// Diagnose Login Issue - Deep dive into what's happening
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const APP_URL = 'https://cloudgreet.com';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 DIAGNOSING LOGIN ISSUE...');
console.log('=====================================');

async function diagnoseLoginIssue() {
  try {
    // Step 1: Check if we have any users in the database
    console.log('1️⃣ Checking database for users...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usersError) {
      console.log('❌ Database error:', usersError.message);
      return;
    }

    console.log(`✅ Found ${users.length} users in database:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (active: ${user.is_active}) - ${user.created_at}`);
    });

    if (users.length === 0) {
      console.log('❌ No users found in database! Registration might not be working.');
      return;
    }

    // Step 2: Try to login with the most recent user
    const testUser = users[0];
    console.log(`\n2️⃣ Testing login with most recent user: ${testUser.email}`);
    
    // First, let's see what the password should be
    console.log('   Testing with common test passwords...');
    
    const testPasswords = ['testpassword123', 'password123', 'test123', 'password'];
    
    for (const password of testPasswords) {
      console.log(`\n   Testing password: "${password}"`);
      
      const loginResponse = await fetch(`${APP_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: password
        }),
      });

      const loginResult = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log(`   ✅ SUCCESS! Password "${password}" works for ${testUser.email}`);
        console.log('   - Token generated:', !!loginResult.data.token);
        console.log('   - User ID:', loginResult.data.user.id);
        
        // Test dashboard access
        console.log('\n3️⃣ Testing dashboard access...');
        const dashboardResponse = await fetch(`${APP_URL}/api/dashboard/data`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginResult.data.token}`,
            'Content-Type': 'application/json',
          },
        });

        const dashboardResult = await dashboardResponse.json();
        
        if (dashboardResponse.ok) {
          console.log('✅ Dashboard access successful!');
        } else {
          console.log('❌ Dashboard access failed:', dashboardResult.error?.message);
        }
        
        return;
      } else {
        console.log(`   ❌ Failed: ${loginResult.error?.message}`);
      }
    }

    // Step 3: Check the actual password hash in database
    console.log('\n3️⃣ Checking password hash in database...');
    
    const { data: userWithHash, error: hashError } = await supabase
      .from('users')
      .select('id, email, password_hash, is_active')
      .eq('email', testUser.email)
      .single();

    if (hashError) {
      console.log('❌ Error fetching user with hash:', hashError.message);
    } else {
      console.log('✅ User data retrieved:');
      console.log('   - Email:', userWithHash.email);
      console.log('   - Is Active:', userWithHash.is_active);
      console.log('   - Has Password Hash:', !!userWithHash.password_hash);
      console.log('   - Password Hash Length:', userWithHash.password_hash?.length || 0);
      
      if (!userWithHash.password_hash) {
        console.log('❌ PROBLEM FOUND: No password hash in database!');
        console.log('   This means registration is not properly hashing passwords.');
      }
    }

  } catch (error) {
    console.log('❌ Error during diagnosis:', error.message);
  }
}

// Run the diagnosis
diagnoseLoginIssue();
