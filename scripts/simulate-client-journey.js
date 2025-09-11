const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Simulate a complete client journey from signup to 30 days of operation
async function simulateClientJourney() {
  console.log('🎬 Starting comprehensive client journey simulation...')
  console.log('=' * 60)

  try {
    // Day 1: Client Registration
    console.log('\n📅 Day 1: Client Registration')
    console.log('-' * 30)
    
    const clientEmail = `client${Date.now()}@example.com`
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([{
        name: 'John Smith',
        email: clientEmail,
        hashed_password: hashedPassword,
        company_name: 'Smith HVAC Services',
        business_type: 'HVAC',
        phone_number: '+15551234567',
        onboarding_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (userError) {
      console.error('❌ Failed to create user:', userError)
      return
    }

    console.log(`✅ Client registered: ${newUser.name} (${newUser.email})`)
    console.log(`   Company: ${newUser.company_name}`)
    console.log(`   Business Type: ${newUser.business_type}`)

    // Day 1: Onboarding Process
    console.log('\n📅 Day 1: Onboarding Process')
    console.log('-' * 30)
    
    // Update user with onboarding completion
    const { error: onboardingError } = await supabase
      .from('users')
      .update({
        onboarding_status: 'completed',
        retell_agent_id: `agent_${Date.now()}`,
        retell_phone_number: '+15551234568',
        stripe_customer_id: `cus_${Date.now()}`,
        stripe_subscription_id: `sub_${Date.now()}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', newUser.id)

    if (onboardingError) {
      console.error('❌ Failed to complete onboarding:', onboardingError)
      return
    }

    console.log('✅ Onboarding completed successfully')
    console.log('   - AI Agent configured')
    console.log('   - Phone number assigned')
    console.log('   - Billing set up')

    // Day 2-30: Generate realistic business activity
    console.log('\n📅 Days 2-30: Business Activity Simulation')
    console.log('-' * 30)

    // Generate customers
    const customers = await generateCustomers(newUser.id)
    console.log(`✅ Generated ${customers.length} customers`)

    // Generate calls over 30 days
    const calls = await generateCalls(newUser.id, customers)
    console.log(`✅ Generated ${calls.length} calls over 30 days`)

    // Generate appointments
    const appointments = await generateAppointments(newUser.id, customers)
    console.log(`✅ Generated ${appointments.length} appointments`)

    // Generate notifications
    const notifications = await generateNotifications(newUser.id, customers, calls, appointments)
    console.log(`✅ Generated ${notifications.length} notifications`)

    // Calculate business metrics
    console.log('\n📊 Business Metrics Summary')
    console.log('-' * 30)
    
    const totalRevenue = calls.length * 75 + appointments.length * 200
    const avgSatisfaction = calls.reduce((sum, call) => sum + (call.satisfaction_score || 5), 0) / calls.length
    const completionRate = calls.filter(call => call.status === 'completed').length / calls.length * 100

    console.log(`💰 Total Revenue: $${totalRevenue.toLocaleString()}`)
    console.log(`📞 Total Calls: ${calls.length}`)
    console.log(`📅 Total Appointments: ${appointments.length}`)
    console.log(`👥 Total Customers: ${customers.length}`)
    console.log(`⭐ Average Satisfaction: ${avgSatisfaction.toFixed(1)}/5`)
    console.log(`✅ Call Completion Rate: ${completionRate.toFixed(1)}%`)

    // Weekly breakdown
    console.log('\n📈 Weekly Performance')
    console.log('-' * 30)
    
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (5 - week) * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      const weekCalls = calls.filter(call => {
        const callDate = new Date(call.created_at)
        return callDate >= weekStart && callDate < weekEnd
      })
      
      const weekAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.start_time)
        return aptDate >= weekStart && aptDate < weekEnd
      })
      
      console.log(`Week ${week}: ${weekCalls.length} calls, ${weekAppointments.length} appointments`)
    }

    console.log('\n🎉 Client journey simulation completed successfully!')
    console.log('=' * 60)
    console.log(`📧 Test with: ${clientEmail}`)
    console.log(`🔑 Password: password123`)

  } catch (error) {
    console.error('❌ Error in client journey simulation:', error)
  }
}

async function generateCustomers(userId) {
  const customerData = [
    { name: 'Alice Johnson', email: 'alice@email.com', phone: '+15551234569', address: '123 Main St' },
    { name: 'Bob Smith', email: 'bob@email.com', phone: '+15551234570', address: '456 Oak Ave' },
    { name: 'Carol Davis', email: 'carol@email.com', phone: '+15551234571', address: '789 Pine Rd' },
    { name: 'David Wilson', email: 'david@email.com', phone: '+15551234572', address: '321 Elm St' },
    { name: 'Eva Brown', email: 'eva@email.com', phone: '+15551234573', address: '654 Maple Dr' },
    { name: 'Frank Garcia', email: 'frank@email.com', phone: '+15551234574', address: '987 Cedar Ln' },
    { name: 'Grace Miller', email: 'grace@email.com', phone: '+15551234575', address: '147 Birch St' },
    { name: 'Henry Taylor', email: 'henry@email.com', phone: '+15551234576', address: '258 Spruce Ave' },
    { name: 'Ivy Lee', email: 'ivy@email.com', phone: '+15551234577', address: '369 Willow Rd' },
    { name: 'Jack White', email: 'jack@email.com', phone: '+15551234578', address: '741 Poplar St' }
  ]

  const { data: customers, error } = await supabase
    .from('customers')
    .insert(
      customerData.map(customer => ({
        user_id: userId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address
      }))
    )
    .select()

  if (error) {
    console.error('Error creating customers:', error)
    return []
  }

  return customers
}

async function generateCalls(userId, customers) {
  const calls = []
  const totalCalls = 120 // 30 days of calls
  
  for (let i = 0; i < totalCalls; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const callType = Math.random() > 0.8 ? 'outbound' : 'inbound'
    const status = Math.random() > 0.15 ? 'completed' : 'missed'
    const duration = status === 'completed' ? Math.floor(Math.random() * 600) + 60 : 0
    const satisfactionScore = status === 'completed' ? [3, 4, 4, 4, 5, 5, 5, 5, 5][Math.floor(Math.random() * 9)] : null
    
    const services = ['AC Repair', 'Heating Repair', 'Maintenance', 'Installation', 'Emergency Service']
    const service = services[Math.floor(Math.random() * services.length)]
    
    calls.push({
      user_id: userId,
      customer_id: customer.id,
      phone_number: customer.phone,
      duration: duration,
      status: status,
      call_type: callType,
      satisfaction_score: satisfactionScore,
      notes: `${service} - ${status === 'completed' ? 'Call completed successfully' : 'Call not answered'}`,
      created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  const { data: insertedCalls, error } = await supabase
    .from('calls')
    .insert(calls)
    .select()

  if (error) {
    console.error('Error creating calls:', error)
    return []
  }

  return insertedCalls
}

async function generateAppointments(userId, customers) {
  const appointments = []
  const totalAppointments = 35 // 30 days of appointments
  
  for (let i = 0; i < totalAppointments; i++) {
    const daysFromNow = Math.floor(Math.random() * 30) - 15 // -15 to +15 days
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const services = ['AC Repair', 'Heating Repair', 'Maintenance', 'Installation', 'Emergency Service', 'Consultation']
    const service = services[Math.floor(Math.random() * services.length)]
    
    const startTime = new Date()
    startTime.setDate(startTime.getDate() + daysFromNow)
    startTime.setHours(Math.floor(Math.random() * 8) + 9) // 9 AM to 5 PM
    startTime.setMinutes(Math.floor(Math.random() * 4) * 15) // 15-minute intervals
    
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + Math.floor(Math.random() * 3) + 1) // 1-4 hours
    
    const statuses = ['scheduled', 'completed', 'cancelled']
    const status = daysFromNow < 0 ? (Math.random() > 0.1 ? 'completed' : 'cancelled') : 'scheduled'
    
    appointments.push({
      user_id: userId,
      customer_id: customer.id,
      title: service,
      description: `${service} for ${customer.name}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: status
    })
  }

  const { data: insertedAppointments, error } = await supabase
    .from('appointments')
    .insert(appointments)
    .select()

  if (error) {
    console.error('Error creating appointments:', error)
    return []
  }

  return insertedAppointments
}

async function generateNotifications(userId, customers, calls, appointments) {
  const notifications = []
  
  // Generate notifications for recent calls
  const recentCalls = calls.filter(call => {
    const callDate = new Date(call.created_at)
    const daysAgo = (new Date() - callDate) / (1000 * 60 * 60 * 24)
    return daysAgo <= 7
  }).slice(0, 8)
  
  recentCalls.forEach(call => {
    const customer = customers.find(c => c.id === call.customer_id)
    notifications.push({
      user_id: userId,
      type: 'call',
      title: 'New Call Received',
      message: `${customer.name} called about ${call.notes}`,
      data: {
        customer: customer.name,
        duration: call.duration,
        phone: call.phone_number
      },
      created_at: call.created_at
    })
  })
  
  // Generate notifications for upcoming appointments
  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time)
    const daysFromNow = (aptDate - new Date()) / (1000 * 60 * 60 * 24)
    return daysFromNow > 0 && daysFromNow <= 7
  }).slice(0, 6)
  
  upcomingAppointments.forEach(appointment => {
    const customer = customers.find(c => c.id === appointment.customer_id)
    notifications.push({
      user_id: userId,
      type: 'appointment',
      title: 'Upcoming Appointment',
      message: `${appointment.title} with ${customer.name} scheduled for ${new Date(appointment.start_time).toLocaleDateString()}`,
      data: {
        customer: customer.name,
        service: appointment.title,
        date: appointment.start_time
      },
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    })
  })
  
  // Generate system notifications
  notifications.push({
    user_id: userId,
    type: 'system',
    title: 'Welcome to CloudGreet!',
    message: 'Your AI receptionist is now active and ready to take calls.',
    data: {
      phone_number: '+15551234568',
      agent_id: 'agent_123'
    },
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  })

  const { data: insertedNotifications, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select()

  if (error) {
    console.error('Error creating notifications:', error)
    return []
  }

  return insertedNotifications
}

// Run the simulation
simulateClientJourney()
