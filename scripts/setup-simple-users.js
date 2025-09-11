const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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

async function setupSimpleUsers() {
  try {
    console.log('🚀 Setting up simple users table...');
    
    // Hash the demo password
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    // Create a simple user structure that matches basic requirements
    const demoUsers = [
      {
        email: 'demo@cloudgreet.com',
        password_hash: hashedPassword,
        name: 'Demo User'
      },
      {
        email: 'admin@cloudgreet.com',
        password_hash: hashedPassword,
        name: 'Admin User'
      }
    ];
    
    // Try to insert users with minimal fields first
    for (const user of demoUsers) {
      const { data, error } = await supabase
        .from('users')
        .upsert(user, { onConflict: 'email' })
        .select();
      
      if (error) {
        console.error(`❌ Error inserting user ${user.email}:`, error);
        console.log('💡 You may need to create the users table manually in Supabase dashboard');
        console.log('📋 Table structure needed:');
        console.log('   - id (uuid, primary key)');
        console.log('   - email (text, unique)');
        console.log('   - password_hash (text)');
        console.log('   - name (text)');
        console.log('   - created_at (timestamp)');
        console.log('   - updated_at (timestamp)');
      } else {
        console.log(`✅ User ${user.email} created/updated successfully`);
      }
    }
    
    console.log('✅ Setup complete!');
    console.log('📧 Demo credentials:');
    console.log('   Email: demo@cloudgreet.com');
    console.log('   Password: demo123');
    console.log('   Email: admin@cloudgreet.com');
    console.log('   Password: demo123');
    
  } catch (error) {
    console.error('❌ Error setting up users:', error);
  }
}

setupSimpleUsers();

