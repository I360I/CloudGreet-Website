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

async function addDemoUsers() {
  try {
    console.log('🚀 Adding demo users to Supabase auth system...');
    
    // Check if demo users already exist
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }
    
    const existingEmails = existingUsers.users.map(u => u.email);
    console.log(`📊 Found ${existingUsers.users.length} existing users`);
    
    const demoUsers = [
      {
        email: 'demo@cloudgreet.com',
        password: 'demo123',
        name: 'Demo User',
        company_name: 'Demo Business',
        business_type: 'HVAC',
        phone_number: '+1 (555) 123-4567',
        onboarding_status: 'completed',
        retell_agent_id: 'agent_demo_123',
        phone_number_assigned: true
      },
      {
        email: 'admin@cloudgreet.com',
        password: 'demo123',
        name: 'Admin User',
        company_name: 'CloudGreet Admin',
        business_type: 'HVAC',
        phone_number: '+1 (555) 999-8888',
        onboarding_status: 'completed',
        retell_agent_id: 'agent_admin_456',
        phone_number_assigned: true
      }
    ];
    
    for (const userData of demoUsers) {
      if (existingEmails.includes(userData.email)) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        continue;
      }
      
      console.log(`👤 Creating user: ${userData.email}`);
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name,
          company_name: userData.company_name,
          business_type: userData.business_type,
          phone_number: userData.phone_number,
          onboarding_status: userData.onboarding_status,
          retell_agent_id: userData.retell_agent_id,
          phone_number_assigned: userData.phone_number_assigned
        }
      });
      
      if (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      } else {
        console.log(`✅ Created user ${userData.email} successfully!`);
        console.log(`   ID: ${data.user.id}`);
        console.log(`   Name: ${userData.name}`);
      }
    }
    
    console.log('\n✅ Demo users setup complete!');
    console.log('📧 Demo credentials:');
    console.log('   Email: demo@cloudgreet.com');
    console.log('   Password: demo123');
    console.log('   Email: admin@cloudgreet.com');
    console.log('   Password: demo123');
    
  } catch (error) {
    console.error('❌ Error adding demo users:', error);
  }
}

addDemoUsers();

