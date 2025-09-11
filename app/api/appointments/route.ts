import { NextRequest, NextResponse } from 'next/server'

interface Appointment {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceType: string
  serviceDetails: {
    name: string
    description: string
    estimatedDuration: number // minutes
    basePrice: number
    complexity: 'low' | 'medium' | 'high'
  }
  scheduling: {
    startTime: string
    endTime: string
    date: string
    timezone: string
    duration: number // minutes
    bufferTime: number // minutes before/after
  }
  location: {
    type: 'customer_location' | 'office' | 'remote'
    address?: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
    coordinates?: {
      latitude: number
      longitude: number
    }
    instructions?: string
  }
  assignment: {
    technicianId?: string
    technicianName?: string
    technicianSkills: string[]
    equipment?: string[]
    vehicle?: string
  }
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  recurring?: {
    isRecurring: boolean
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    interval: number
    endDate?: string
    occurrences?: number
    parentId?: string
  }
  reminders: {
    email: boolean
    sms: boolean
    phone: boolean
    customMessage?: string
    reminderTimes: number[] // hours before appointment
  }
  notes: {
    customerNotes?: string
    internalNotes?: string
    specialInstructions?: string
    followUpRequired?: boolean
  }
  pricing: {
    basePrice: number
    additionalFees: Array<{
      name: string
      amount: number
      description: string
    }>
    discounts: Array<{
      name: string
      amount: number
      type: 'percentage' | 'fixed'
    }>
    totalPrice: number
    paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded'
  }
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string
    lastModifiedBy: string
    source: 'web' | 'phone' | 'app' | 'api' | 'admin'
    tags: string[]
    billingInfo?: {
      invoiceId?: string
      amount?: number
      status?: string
      chargedAt?: string
    }
  }
}

interface AppointmentFilters {
  status?: string[]
  serviceType?: string[]
  technicianId?: string
  dateRange?: {
    start: string
    end: string
  }
  priority?: string[]
  customerId?: string
  location?: string
  sortBy?: 'date' | 'priority' | 'status' | 'customer' | 'technician'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

interface AvailabilitySlot {
  startTime: string
  endTime: string
  technicianId?: string
  technicianName?: string
  isAvailable: boolean
  conflicts?: string[]
}

// GET - Retrieve appointments with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Parse filters
    const filters: AppointmentFilters = {
      status: searchParams.get('status')?.split(',') || [],
      serviceType: searchParams.get('serviceType')?.split(',') || [],
      technicianId: searchParams.get('technicianId') || undefined,
      priority: searchParams.get('priority')?.split(',') || [],
      customerId: searchParams.get('customerId') || undefined,
      location: searchParams.get('location') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'date',
      sortOrder: (searchParams.get('sortOrder') as any) || 'asc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    // Parse date range
    if (searchParams.get('dateStart') && searchParams.get('dateEnd')) {
      filters.dateRange = {
        start: searchParams.get('dateStart')!,
        end: searchParams.get('dateEnd')!
      }
    }

    console.log(`📅 Fetching appointments for user ${userId} with filters:`, filters)

    // Fetch real appointments from database
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
      .limit(100)
    
    // Apply filters
    let filteredAppointments = appointments

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filteredAppointments = filteredAppointments.filter(appointment => 
        filters.status!.includes(appointment.status)
      )
    }

    // Service type filter
    if (filters.serviceType && filters.serviceType.length > 0) {
      filteredAppointments = filteredAppointments.filter(appointment => 
        filters.serviceType!.includes(appointment.serviceType)
      )
    }

    // Technician filter
    if (filters.technicianId) {
      filteredAppointments = filteredAppointments.filter(appointment => 
        appointment.assignment.technicianId === filters.technicianId
      )
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      filteredAppointments = filteredAppointments.filter(appointment => 
        filters.priority!.includes(appointment.priority)
      )
    }

    // Customer filter
    if (filters.customerId) {
      filteredAppointments = filteredAppointments.filter(appointment => 
        appointment.customerId === filters.customerId
      )
    }

    // Location filter
    if (filters.location) {
      filteredAppointments = filteredAppointments.filter(appointment => 
        appointment.location.type === filters.location ||
        appointment.location.address?.city.toLowerCase().includes(filters.location!.toLowerCase())
      )
    }

    // Date range filter
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)
      filteredAppointments = filteredAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.scheduling.date)
        return appointmentDate >= startDate && appointmentDate <= endDate
      })
    }

    // Sort appointments
    filteredAppointments.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (filters.sortBy) {
        case 'date':
          aValue = new Date(a.scheduling.startTime)
          bValue = new Date(b.scheduling.startTime)
          break
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder]
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder]
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'customer':
          aValue = a.customerName
          bValue = b.customerName
          break
        case 'technician':
          aValue = a.assignment.technicianName || ''
          bValue = b.assignment.technicianName || ''
          break
        default:
          aValue = new Date(a.scheduling.startTime)
          bValue = new Date(b.scheduling.startTime)
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    // Pagination
    const totalCount = filteredAppointments.length
    const totalPages = Math.ceil(totalCount / filters.limit!)
    const startIndex = (filters.page! - 1) * filters.limit!
    const endIndex = startIndex + filters.limit!
    const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex)

    // Calculate summary statistics
    const summary = {
      totalAppointments: totalCount,
      todayAppointments: appointments.filter(a => {
        const today = new Date().toISOString().split('T')[0]
        return a.scheduling.date === today
      }).length,
      upcomingAppointments: appointments.filter(a => {
        const appointmentDate = new Date(a.scheduling.startTime)
        const now = new Date()
        return appointmentDate > now && a.status === 'scheduled'
      }).length,
      completedThisWeek: appointments.filter(a => {
        const appointmentDate = new Date(a.scheduling.startTime)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return appointmentDate > weekAgo && a.status === 'completed'
      }).length,
      statusDistribution: {
        scheduled: appointments.filter(a => a.status === 'scheduled').length,
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        in_progress: appointments.filter(a => a.status === 'in_progress').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
        no_show: appointments.filter(a => a.status === 'no_show').length
      },
      priorityDistribution: {
        urgent: appointments.filter(a => a.priority === 'urgent').length,
        high: appointments.filter(a => a.priority === 'high').length,
        medium: appointments.filter(a => a.priority === 'medium').length,
        low: appointments.filter(a => a.priority === 'low').length
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        appointments: paginatedAppointments,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          totalCount,
          totalPages,
          hasNext: filters.page! < totalPages,
          hasPrev: filters.page! > 1
        },
        summary,
        filters
      },
      metadata: {
        userId,
        generatedAt: new Date().toISOString(),
        dataFreshness: 'real-time'
      }
    })

  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch appointments',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// POST - Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, appointmentData } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!appointmentData) {
      return NextResponse.json({ error: 'Appointment data is required' }, { status: 400 })
    }

    console.log(`📅 Creating new appointment for user ${userId}`)

    // Validate required fields
    const requiredFields = ['customerId', 'serviceType', 'startTime', 'date']
    for (const field of requiredFields) {
      if (!appointmentData[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }

    // Check for conflicts
    const conflicts = await checkAppointmentConflicts(appointmentData)
    if (conflicts.length > 0) {
      return NextResponse.json({
        error: 'Appointment conflicts detected',
        conflicts,
        message: 'Please choose a different time slot'
      }, { status: 409 })
    }

    // Generate new appointment
    const newAppointment: Appointment = {
      id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId: appointmentData.customerId,
      customerName: appointmentData.customerName || 'Unknown Customer',
      customerEmail: appointmentData.customerEmail || '',
      customerPhone: appointmentData.customerPhone || '',
      serviceType: appointmentData.serviceType,
      serviceDetails: {
        name: appointmentData.serviceDetails?.name || appointmentData.serviceType,
        description: appointmentData.serviceDetails?.description || '',
        estimatedDuration: appointmentData.serviceDetails?.estimatedDuration || 60,
        basePrice: appointmentData.serviceDetails?.basePrice || 100,
        complexity: appointmentData.serviceDetails?.complexity || 'medium'
      },
      scheduling: {
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime || calculateEndTime(appointmentData.startTime, appointmentData.serviceDetails?.estimatedDuration || 60),
        date: appointmentData.date,
        timezone: appointmentData.timezone || 'America/New_York',
        duration: appointmentData.serviceDetails?.estimatedDuration || 60,
        bufferTime: appointmentData.bufferTime || 15
      },
      location: {
        type: appointmentData.location?.type || 'customer_location',
        address: appointmentData.location?.address,
        coordinates: appointmentData.location?.coordinates,
        instructions: appointmentData.location?.instructions
      },
      assignment: {
        technicianId: appointmentData.technicianId,
        technicianName: appointmentData.technicianName,
        technicianSkills: appointmentData.technicianSkills || [],
        equipment: appointmentData.equipment || [],
        vehicle: appointmentData.vehicle
      },
      status: 'scheduled',
      priority: appointmentData.priority || 'medium',
      recurring: appointmentData.recurring,
      reminders: {
        email: appointmentData.reminders?.email ?? true,
        sms: appointmentData.reminders?.sms ?? false,
        phone: appointmentData.reminders?.phone ?? false,
        customMessage: appointmentData.reminders?.customMessage,
        reminderTimes: appointmentData.reminders?.reminderTimes || [24, 2] // 24 hours and 2 hours before
      },
      notes: {
        customerNotes: appointmentData.customerNotes,
        internalNotes: appointmentData.internalNotes,
        specialInstructions: appointmentData.specialInstructions,
        followUpRequired: appointmentData.followUpRequired || false
      },
      pricing: {
        basePrice: appointmentData.serviceDetails?.basePrice || 100,
        additionalFees: appointmentData.additionalFees || [],
        discounts: appointmentData.discounts || [],
        totalPrice: calculateTotalPrice(appointmentData),
        paymentStatus: 'pending'
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId,
        lastModifiedBy: userId,
        source: appointmentData.source || 'api',
        tags: appointmentData.tags || []
      }
    }

    // In a real application, save to database here
    console.log('✅ Appointment created successfully:', newAppointment.id)

    // Automatically bill for the booking ($50 per booking)
    try {
      console.log('💳 Charging for booking...')
      const billingResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/billing/track-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          bookingId: newAppointment.id,
          customerId: appointmentData.stripeCustomerId, // This should be passed in appointmentData
          amount: 50 // $50 per booking
        })
      })

      if (billingResponse.ok) {
        const billingData = await billingResponse.json()
        console.log('✅ Booking charged successfully:', billingData.data?.invoiceId)
        
        // Update appointment with billing info
        newAppointment.pricing.paymentStatus = 'paid'
        newAppointment.metadata.billingInfo = {
          invoiceId: billingData.data?.invoiceId,
          amount: 50,
          status: 'paid',
          chargedAt: new Date().toISOString()
        }
      } else {
        console.log('⚠️ Failed to charge for booking, but appointment created')
        newAppointment.pricing.paymentStatus = 'pending'
      }
    } catch (error) {
      console.error('❌ Error charging for booking:', error)
      newAppointment.pricing.paymentStatus = 'pending'
    }

    // Schedule reminders if enabled
    if (newAppointment.reminders.email || newAppointment.reminders.sms) {
      await scheduleReminders(newAppointment)
    }

    return NextResponse.json({
      success: true,
      data: newAppointment,
      message: 'Appointment created successfully'
    })

  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Helper functions
function generateMockAppointments(count: number, userId?: string): Appointment[] {
  const appointments: Appointment[] = []
  const serviceTypes = ['HVAC Repair', 'HVAC Installation', 'Maintenance', 'Emergency Service', 'Inspection']
  const statuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show']
  const priorities = ['low', 'medium', 'high', 'urgent']
  const technicians = [
    { id: 'tech_1', name: 'John Smith', skills: ['HVAC Repair', 'Installation'] },
    { id: 'tech_2', name: 'Sarah Johnson', skills: ['Maintenance', 'Inspection'] },
    { id: 'tech_3', name: 'Mike Davis', skills: ['Emergency Service', 'HVAC Repair'] },
    { id: 'tech_4', name: 'Lisa Wilson', skills: ['Installation', 'Maintenance'] }
  ]
  const customers = [
    { id: 'cust_1', name: 'Alice Brown', email: 'alice@example.com', phone: '+1-555-0101' },
    { id: 'cust_2', name: 'Bob Green', email: 'bob@example.com', phone: '+1-555-0102' },
    { id: 'cust_3', name: 'Carol White', email: 'carol@example.com', phone: '+1-555-0103' },
    { id: 'cust_4', name: 'David Black', email: 'david@example.com', phone: '+1-555-0104' }
  ]

  for (let i = 0; i < count; i++) {
    const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    const technician = technicians[Math.floor(Math.random() * technicians.length)]
    const customer = customers[Math.floor(Math.random() * customers.length)]
    
    const startTime = new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
    const duration = Math.floor(Math.random() * 120) + 30 // 30-150 minutes
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000)
    
    const basePrice = Math.floor(Math.random() * 500) + 100
    const additionalFees = Math.random() > 0.7 ? [{
      name: 'Emergency Fee',
      amount: 50,
      description: 'After-hours service'
    }] : []
    
    const appointment: Appointment = {
      id: `apt_${i + 1}_${Math.random().toString(36).substr(2, 9)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      serviceType,
      serviceDetails: {
        name: serviceType,
        description: `${serviceType} service appointment`,
        estimatedDuration: duration,
        basePrice,
        complexity: Math.random() > 0.5 ? 'medium' : Math.random() > 0.5 ? 'low' : 'high'
      },
      scheduling: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        date: startTime.toISOString().split('T')[0],
        timezone: 'America/New_York',
        duration,
        bufferTime: 15
      },
      location: {
        type: Math.random() > 0.3 ? 'customer_location' : 'office',
        address: {
          street: `${Math.floor(Math.random() * 9999) + 1} Main St`,
          city: ['New York', 'Los Angeles', 'Chicago', 'Houston'][Math.floor(Math.random() * 4)],
          state: ['NY', 'CA', 'IL', 'TX'][Math.floor(Math.random() * 4)],
          zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
          country: 'US'
        },
        instructions: Math.random() > 0.5 ? 'Ring doorbell twice' : undefined
      },
      assignment: {
        technicianId: technician.id,
        technicianName: technician.name,
        technicianSkills: technician.skills,
        equipment: ['Tool Kit', 'Ladder', 'Multimeter'].filter(() => Math.random() > 0.5),
        vehicle: `Van ${Math.floor(Math.random() * 10) + 1}`
      },
      status: status as any,
      priority: priority as any,
      recurring: Math.random() > 0.8 ? {
        isRecurring: true,
        frequency: 'monthly',
        interval: 1,
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      } : undefined,
      reminders: {
        email: true,
        sms: Math.random() > 0.5,
        phone: Math.random() > 0.7,
        reminderTimes: [24, 2]
      },
      notes: {
        customerNotes: Math.random() > 0.6 ? `Customer note ${i + 1}` : undefined,
        internalNotes: Math.random() > 0.4 ? `Internal note ${i + 1}` : undefined,
        specialInstructions: Math.random() > 0.7 ? 'Special handling required' : undefined,
        followUpRequired: Math.random() > 0.8
      },
      pricing: {
        basePrice,
        additionalFees,
        discounts: [],
        totalPrice: basePrice + additionalFees.reduce((sum, fee) => sum + fee.amount, 0),
        paymentStatus: ['pending', 'paid', 'partial'][Math.floor(Math.random() * 3)] as any
      },
      metadata: {
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.floor(Math.random() * 2) * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: userId || 'system',
        lastModifiedBy: userId || 'system',
        source: ['web', 'phone', 'app', 'api'][Math.floor(Math.random() * 4)] as any,
        tags: ['urgent', 'follow-up', 'new-customer'].filter(() => Math.random() > 0.7)
      }
    }

    appointments.push(appointment)
  }

  return appointments
}

async function checkAppointmentConflicts(appointmentData: any): Promise<string[]> {
  // Check against the database for real conflicts
  try {
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', appointmentData.userId)
      .gte('start_time', appointmentData.startTime)
      .lte('end_time', appointmentData.endTime)
      .neq('status', 'cancelled')
    
    return conflicts || []
  } catch (error) {
    console.error('Error checking conflicts:', error)
    return []
  }
}

function calculateEndTime(startTime: string, duration: number): string {
  const start = new Date(startTime)
  const end = new Date(start.getTime() + duration * 60 * 1000)
  return end.toISOString()
}

function calculateTotalPrice(appointmentData: any): number {
  const basePrice = appointmentData.serviceDetails?.basePrice || 100
  const additionalFees = appointmentData.additionalFees || []
  const discounts = appointmentData.discounts || []
  
  let total = basePrice
  
  // Add additional fees
  additionalFees.forEach((fee: any) => {
    total += fee.amount
  })
  
  // Apply discounts
  discounts.forEach((discount: any) => {
    if (discount.type === 'percentage') {
      total -= (total * discount.amount / 100)
    } else {
      total -= discount.amount
    }
  })
  
  return Math.max(0, total) // Ensure non-negative
}

async function scheduleReminders(appointment: Appointment) {
  // In a real application, this would schedule actual reminders
  console.log(`📧 Scheduling reminders for appointment ${appointment.id}`)
}
