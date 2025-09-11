const { createClient } = require('@supabase/supabase-js')
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

// Sample data for realistic simulation
const sampleCustomers = [
  { name: 'John Smith', email: 'john.smith@email.com', phone: '+15551234567', address: '123 Main St, Anytown, ST 12345' },
  { name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+15551234568', address: '456 Oak Ave, Anytown, ST 12345' },
  { name: 'Mike Davis', email: 'mike.davis@email.com', phone: '+15551234569', address: '789 Pine Rd, Anytown, ST 12345' },
  { name: 'Lisa Wilson', email: 'lisa.wilson@email.com', phone: '+15551234570', address: '321 Elm St, Anytown, ST 12345' },
  { name: 'David Brown', email: 'david.brown@email.com', phone: '+15551234571', address: '654 Maple Dr, Anytown, ST 12345' },
  { name: 'Jennifer Garcia', email: 'j.garcia@email.com', phone: '+15551234572', address: '987 Cedar Ln, Anytown, ST 12345' },
  { name: 'Robert Miller', email: 'r.miller@email.com', phone: '+15551234573', address: '147 Birch St, Anytown, ST 12345' },
  { name: 'Amanda Taylor', email: 'amanda.t@email.com', phone: '+15551234574', address: '258 Spruce Ave, Anytown, ST 12345' },
  { name: 'Christopher Lee', email: 'chris.lee@email.com', phone: '+15551234575', address: '369 Willow Rd, Anytown, ST 12345' },
  { name: 'Michelle White', email: 'michelle.w@email.com', phone: '+15551234576', address: '741 Poplar St, Anytown, ST 12345' }
]

const callTypes = ['inbound', 'outbound']
const callStatuses = ['completed', 'missed', 'voicemail']
const services = [
  'AC Repair', 'Heating Repair', 'Maintenance', 'Installation', 'Emergency Service',
  'Duct Cleaning', 'Thermostat Installation', 'Filter Replacement', 'System Check'
]

const appointmentTypes = [
  'AC Repair', 'Heating Repair', 'Maintenance', 'Installation', 'Emergency Service',
  'Duct Cleaning', 'Thermostat Installation', 'Filter Replacement', 'System Check',
  'Consultation', 'Estimate', 'Follow-up'
]

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function getRandomDate(daysAgo) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(Math.floor(Math.random() * 12) + 8) // 8 AM to 8 PM
  date.setMinutes(Math.floor(Math.random() * 60))
  return date.toISOString()
}

function getRandomDuration() {
  return Math.floor(Math.random() * 600) + 60 // 1-10 minutes
}

function getRandomSatisfactionScore() {
  const scores = [3, 4, 4, 4, 5, 5, 5, 5, 5] // Weighted towards higher scores
  return getRandomElement(scores)
}

async function generateCustomerData(userId) {
  console.log('📞 Generating customer data...')
  
  // Insert customers
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .insert(
      sampleCustomers.map(customer => ({
        user_id: userId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address
      }))
    )
    .select()

  if (customersError) {
    console.error('Error creating customers:', customersError)
    return []
  }

  console.log(`✅ Created ${customers.length} customers`)
  return customers
}

async function generateCallData(userId, customers) {
  console.log('📞 Generating call data...')
  
  const calls = []
  const totalCalls = 150 // 30 days of calls
  
  for (let i = 0; i < totalCalls; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const customer = getRandomElement(customers)
    const callType = getRandomElement(callTypes)
    const status = getRandomElement(callStatuses)
    const duration = status === 'completed' ? getRandomDuration() : 0
    const satisfactionScore = status === 'completed' ? getRandomSatisfactionScore() : null
    
    calls.push({
      user_id: userId,
      customer_id: customer.id,
      phone_number: customer.phone,
      duration: duration,
      status: status,
      call_type: callType,
      satisfaction_score: satisfactionScore,
      notes: `${getRandomElement(services)} - ${status === 'completed' ? 'Call completed successfully' : 'Call not answered'}`,
      created_at: getRandomDate(daysAgo)
    })
  }

  const { data: insertedCalls, error: callsError } = await supabase
    .from('calls')
    .insert(calls)
    .select()

  if (callsError) {
    console.error('Error creating calls:', callsError)
    return []
  }

  console.log(`✅ Created ${insertedCalls.length} calls`)
  return insertedCalls
}

async function generateAppointmentData(userId, customers) {
  console.log('📅 Generating appointment data...')
  
  const appointments = []
  const totalAppointments = 45 // 30 days of appointments
  
  for (let i = 0; i < totalAppointments; i++) {
    const daysFromNow = Math.floor(Math.random() * 30) - 15 // -15 to +15 days
    const customer = getRandomElement(customers)
    const service = getRandomElement(appointmentTypes)
    const startTime = new Date()
    startTime.setDate(startTime.getDate() + daysFromNow)
    startTime.setHours(Math.floor(Math.random() * 8) + 9) // 9 AM to 5 PM
    startTime.setMinutes(Math.floor(Math.random() * 4) * 15) // 15-minute intervals
    
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + Math.floor(Math.random() * 3) + 1) // 1-4 hours
    
    const statuses = ['scheduled', 'completed', 'cancelled', 'rescheduled']
    const status = daysFromNow < 0 ? getRandomElement(['completed', 'cancelled']) : 'scheduled'
    
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

  const { data: insertedAppointments, error: appointmentsError } = await supabase
    .from('appointments')
    .insert(appointments)
    .select()

  if (appointmentsError) {
    console.error('Error creating appointments:', appointmentsError)
    return []
  }

  console.log(`✅ Created ${insertedAppointments.length} appointments`)
  return insertedAppointments
}

async function generateNotificationData(userId, customers, calls, appointments) {
  console.log('🔔 Generating notification data...')
  
  const notifications = []
  
  // Generate notifications for recent calls
  const recentCalls = calls.filter(call => {
    const callDate = new Date(call.created_at)
    const daysAgo = (new Date() - callDate) / (1000 * 60 * 60 * 24)
    return daysAgo <= 7
  }).slice(0, 10)
  
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
  }).slice(0, 8)
  
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
      phone_number: '+15551234567',
      agent_id: 'agent_123'
    },
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  })
  
  notifications.push({
    user_id: userId,
    type: 'system',
    title: 'Setup Complete',
    message: 'All systems are configured and your AI receptionist is live!',
    data: {},
    created_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()
  })

  const { data: insertedNotifications, error: notificationsError } = await supabase
    .from('notifications')
    .insert(notifications)
    .select()

  if (notificationsError) {
    console.error('Error creating notifications:', notificationsError)
    return []
  }

  console.log(`✅ Created ${insertedNotifications.length} notifications`)
  return insertedNotifications
}

async function generateClientData() {
  try {
    console.log('🚀 Starting 30-day client data generation...')
    
    // Get the test user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@cloudgreet.com')
      .single()

    if (userError || !user) {
      console.error('Test user not found. Please run the database setup first.')
      return
    }

    console.log(`📊 Generating data for user: ${user.name} (${user.email})`)

    // Generate all data
    const customers = await generateCustomerData(user.id)
    const calls = await generateCallData(user.id, customers)
    const appointments = await generateAppointmentData(user.id, customers)
    const notifications = await generateNotificationData(user.id, customers, calls, appointments)

    console.log('🎉 30-day client data generation completed!')
    console.log(`📈 Summary:`)
    console.log(`   - ${customers.length} customers`)
    console.log(`   - ${calls.length} calls`)
    console.log(`   - ${appointments.length} appointments`)
    console.log(`   - ${notifications.length} notifications`)

  } catch (error) {
    console.error('❌ Error generating client data:', error)
  }
}

// Run the data generation
generateClientData()
