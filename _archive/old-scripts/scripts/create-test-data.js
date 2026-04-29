/**
 * Script to create test data for verifying data flow
 * Creates test appointments and calls in the database
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestData() {
  try {
    console.log('Creating test data...')

    // Get first business
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, business_name')
      .limit(1)

    if (businessError || !businesses || businesses.length === 0) {
      console.error('No businesses found. Please create a business first.')
      process.exit(1)
    }

    const businessId = businesses[0].id
    const businessName = businesses[0].business_name

    console.log(`Using business: ${businessName} (${businessId})`)

    // Create test appointments
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)

    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)
    nextWeek.setHours(14, 0, 0, 0)

    const appointments = [
      {
        business_id: businessId,
        customer_name: 'Test Customer 1',
        customer_phone: '+1234567890',
        customer_email: 'test1@example.com',
        service_type: 'HVAC Service',
        scheduled_date: tomorrow.toISOString().split('T')[0],
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour later
        status: 'scheduled',
        estimated_value: 250,
        address: '123 Test St, Test City, TS 12345',
        notes: 'Test appointment created by script'
      },
      {
        business_id: businessId,
        customer_name: 'Test Customer 2',
        customer_phone: '+1234567891',
        customer_email: 'test2@example.com',
        service_type: 'Plumbing Repair',
        scheduled_date: nextWeek.toISOString().split('T')[0],
        start_time: nextWeek.toISOString(),
        end_time: new Date(nextWeek.getTime() + 90 * 60 * 1000).toISOString(), // 1.5 hours later
        status: 'scheduled',
        estimated_value: 350,
        address: '456 Test Ave, Test City, TS 12345',
        notes: 'Test appointment created by script'
      }
    ]

    console.log('Creating test appointments...')
    const { data: createdAppointments, error: appointmentError } = await supabase
      .from('appointments')
      .insert(appointments)
      .select()

    if (appointmentError) {
      console.error('Error creating appointments:', appointmentError)
      process.exit(1)
    }

    console.log(`✅ Created ${createdAppointments.length} test appointments`)

    // Create test calls
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    yesterday.setHours(9, 0, 0, 0)

    const calls = [
      {
        business_id: businessId,
        from_number: '+1987654321',
        to_number: '+1234567890',
        status: 'completed',
        duration: 180, // 3 minutes
        created_at: yesterday.toISOString(),
        call_direction: 'inbound'
      },
      {
        business_id: businessId,
        from_number: '+1987654322',
        to_number: '+1234567890',
        status: 'missed',
        duration: 0,
        created_at: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
        call_direction: 'inbound'
      }
    ]

    console.log('Creating test calls...')
    const { data: createdCalls, error: callError } = await supabase
      .from('calls')
      .insert(calls)
      .select()

    if (callError) {
      console.error('Error creating calls:', callError)
      // Don't exit - calls might not be critical
      console.log('⚠️  Could not create calls (this is okay if calls table structure differs)')
    } else {
      console.log(`✅ Created ${createdCalls.length} test calls`)
    }

    console.log('\n✅ Test data created successfully!')
    console.log(`\nBusiness ID: ${businessId}`)
    console.log(`Appointments: ${createdAppointments.length}`)
    console.log(`Calls: ${createdCalls?.length || 0}`)
    console.log('\nYou can now test the dashboard to verify data flow.')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createTestData()

