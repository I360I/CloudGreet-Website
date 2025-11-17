/**
 * Script to fix custom_users table schema
 * Run this to add missing columns: name and role
 * 
 * Usage: node scripts/fix-registration-schema.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixCustomUsersTable() {
  console.log('🔧 Fixing custom_users table schema...')
  
  try {
    // Add 'name' column if it doesn't exist
    console.log('Adding "name" column...')
    const { error: nameError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE custom_users 
        ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      `
    })
    
    if (nameError) {
      // Try direct SQL execution
      const { error: directNameError } = await supabase
        .from('custom_users')
        .select('name')
        .limit(1)
      
      if (directNameError && directNameError.message.includes('column "name" does not exist')) {
        console.log('⚠️  Cannot add column via RPC. Please run migration manually in Supabase SQL Editor:')
        console.log('   migrations/FIX_CUSTOM_USERS_TABLE.sql')
        return false
      }
    }
    
    // Add 'role' column if it doesn't exist
    console.log('Adding "role" column...')
    const { error: roleError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE custom_users 
        ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner' 
        CHECK (role IN ('owner', 'admin', 'user'));
      `
    })
    
    if (roleError) {
      const { error: directRoleError } = await supabase
        .from('custom_users')
        .select('role')
        .limit(1)
      
      if (directRoleError && directRoleError.message.includes('column "role" does not exist')) {
        console.log('⚠️  Cannot add column via RPC. Please run migration manually in Supabase SQL Editor:')
        console.log('   migrations/FIX_CUSTOM_USERS_TABLE.sql')
        return false
      }
    }
    
    // Update existing rows
    console.log('Updating existing rows...')
    const { data: usersWithoutName } = await supabase
      .from('custom_users')
      .select('id, first_name, last_name, name')
      .or('name.is.null,name.eq.')
    
    if (usersWithoutName && usersWithoutName.length > 0) {
      for (const user of usersWithoutName) {
        const name = `${user.first_name} ${user.last_name}`.trim()
        await supabase
          .from('custom_users')
          .update({ name })
          .eq('id', user.id)
      }
      console.log(`✅ Updated ${usersWithoutName.length} existing users with name`)
    }
    
    const { data: usersWithoutRole } = await supabase
      .from('custom_users')
      .select('id, role')
      .is('role', null)
    
    if (usersWithoutRole && usersWithoutRole.length > 0) {
      for (const user of usersWithoutRole) {
        await supabase
          .from('custom_users')
          .update({ role: 'owner' })
          .eq('id', user.id)
      }
      console.log(`✅ Updated ${usersWithoutRole.length} existing users with role`)
    }
    
    console.log('✅ Schema fix complete!')
    return true
  } catch (error) {
    console.error('❌ Error fixing schema:', error.message)
    console.error('Please run migration manually in Supabase SQL Editor:')
    console.error('   migrations/FIX_CUSTOM_USERS_TABLE.sql')
    return false
  }
}

// Run the fix
fixCustomUsersTable()
  .then(success => {
    if (success) {
      console.log('\n✅ Registration schema is now fixed!')
      process.exit(0)
    } else {
      console.log('\n⚠️  Please run the migration manually')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

