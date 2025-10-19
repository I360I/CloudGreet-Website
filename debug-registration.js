const { createClient } = require('@supabase/supabase-js')

// Test Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xpyrovyhktapbvzdxaho.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweXJvdnloa3RhcGJ2emR4YWhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAwNDA4MCwiZXhwIjoyMDcxNTgwMDgwfQ.ZJJq5Y3xi5ZgclqVT4lj1MyozEcfuDEeApftwiwL2tk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRegistration() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Database connection error:', error)
      return
    }
    
    console.log('✅ Database connection successful')
    
    // Test user creation
    console.log('Testing user creation...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test-debug@example.com',
      password: 'Password123!',
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        phone: '5551234567',
        is_admin: false
      },
      email_confirm: true
    })
    
    if (authError) {
      console.error('❌ User creation error:', authError)
      return
    }
    
    console.log('✅ User creation successful:', authUser.user.id)
    
    // Test business creation
    console.log('Testing business creation...')
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        owner_id: authUser.user.id,
        business_name: 'Test Business',
        business_type: 'HVAC Services',
        email: 'test-debug@example.com',
        phone: '5551234567',
        phone_number: '5551234567',
        address: '123 Main St',
        city: 'Unknown',
        state: 'Unknown',
        zip_code: '00000',
        website: '',
        description: 'Professional HVAC services',
        services: ['General Services'],
        service_areas: ['Local Area'],
        business_hours: {
          monday: { open: '08:00', close: '17:00' },
          tuesday: { open: '08:00', close: '17:00' },
          wednesday: { open: '08:00', close: '17:00' },
          thursday: { open: '08:00', close: '17:00' },
          friday: { open: '08:00', close: '17:00' },
          saturday: { open: '09:00', close: '15:00' },
          sunday: { open: '09:00', close: '15:00' }
        },
        greeting_message: 'Thank you for calling Test Business. How can I help you today?',
        tone: 'professional',
        onboarding_completed: false,
        account_status: 'new_account',
        subscription_status: 'inactive'
      })
      .select()
      .single()
    
    if (businessError) {
      console.error('❌ Business creation error:', businessError)
      // Cleanup user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return
    }
    
    console.log('✅ Business creation successful:', business.id)
    
    // Cleanup
    await supabase.auth.admin.deleteUser(authUser.user.id)
    console.log('✅ Test completed successfully')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testRegistration()
