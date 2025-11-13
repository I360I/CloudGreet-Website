#!/usr/bin/env node
/**
 * CREATE ADMIN ACCOUNT SCRIPT
 * 
 * Creates the first admin account directly in the database
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const email = 'anthony@cloudgreet.com'
const password = 'Anthonyis42'
const firstName = 'Anthony'
const lastName = 'CloudGreet'

async function createAdminAccount() {
  console.log('🚀 Creating Admin Account...\n')
  console.log(`Email: ${email}`)
  console.log(`Name: ${firstName} ${lastName}\n`)
  
  try {
    // Step 1: Check if admin already exists
    console.log('📋 Checking if admin account already exists...')
    const { data: existingUser } = await supabaseAdmin
      .from('custom_users')
      .select('id, email, is_admin')
      .eq('email', email.toLowerCase())
      .single()
    
    if (existingUser) {
      console.log('⚠️  Admin account already exists!')
      console.log('Updating password and admin status...\n')
      
      // Update existing account
      const passwordHash = await bcrypt.hash(password, 10)
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('custom_users')
        .update({
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          is_admin: true,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase())
        .select()
        .single()
      
      if (updateError) {
        console.error('❌ Failed to update admin account:', updateError.message)
        process.exit(1)
      }
      
      console.log('✅ Admin account updated successfully!\n')
      console.log('You can now login at: https://cloudgreet.com/admin/login')
      console.log(`Email: ${email}`)
      console.log(`Password: ${password}\n`)
      process.exit(0)
    }
    
    // Step 2: Hash password
    console.log('🔐 Hashing password...')
    const passwordHash = await bcrypt.hash(password, 10)
    console.log('✅ Password hashed\n')
    
    // Step 3: Create admin account
    console.log('👤 Creating admin account in database...')
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('custom_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
        is_admin: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Failed to create admin account:', insertError.message)
      console.error('Error details:', JSON.stringify(insertError, null, 2))
      
      // If it's a constraint error, provide helpful message
      if (insertError.code === '23505') {
        console.error('\n⚠️  Account already exists. Try running the script again to update it.')
      }
      
      process.exit(1)
    }
    
    console.log('✅ Admin account created successfully!\n')
    console.log('='.repeat(60))
    console.log('🎉 SUCCESS!')
    console.log('='.repeat(60))
    console.log('\nYou can now login at: https://cloudgreet.com/admin/login')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}\n`)
    console.log('Account Details:')
    console.log(`  ID: ${newUser.id}`)
    console.log(`  Email: ${newUser.email}`)
    console.log(`  Role: ${newUser.role}`)
    console.log(`  Admin: ${newUser.is_admin}`)
    console.log(`  Active: ${newUser.is_active}\n`)
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

createAdminAccount()

