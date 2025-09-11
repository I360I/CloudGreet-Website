import { NextRequest, NextResponse } from 'next/server'

interface CalendarBookingData {
  customer_name: string
  customer_email: string
  customer_phone: string
  service_type: string
  preferred_date: string
  preferred_time: string
  duration: number
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const bookingData: CalendarBookingData = await request.json()
    
    console.log('Processing calendar booking:', bookingData)

    // Validate required fields
    if (!bookingData.customer_name || !bookingData.customer_email || !bookingData.service_type) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Customer name, email, and service type are required'
      }, { status: 400 })
    }

    // Azure Cognitive Services can handle this through:
    // 1. Intent Recognition (identify booking intent)
    // 2. Entity Extraction (extract date, time, service)
    // 3. Webhook Integration (trigger calendar actions)
    // 4. Natural Language Processing (understand customer requests)

    // Simulate calendar booking process
    const bookingResult = {
      booking_id: `booking_${Date.now()}`,
      status: 'confirmed',
      customer: {
        name: bookingData.customer_name,
        email: bookingData.customer_email,
        phone: bookingData.customer_phone
      },
      appointment: {
        service: bookingData.service_type,
        date: bookingData.preferred_date,
        time: bookingData.preferred_time,
        duration: bookingData.duration || 60,
        notes: bookingData.notes || ''
      },
      confirmation: {
        method: 'email',
        sent: true,
        confirmation_code: `CONF-${Date.now()}`
      }
    }

    // In a real implementation, this would:
    // 1. Check calendar availability
    // 2. Create calendar event
    // 3. Send confirmation email
    // 4. Update customer database
    // 5. Trigger follow-up reminders

    return NextResponse.json({
      success: true,
      booking: bookingResult,
      message: 'Appointment booked successfully',
      azure_features: {
        intent_recognition: 'Identified booking intent',
        entity_extraction: 'Extracted date, time, and service details',
        natural_language: 'Understood customer request',
        webhook_integration: 'Triggered calendar actions',
        confirmation_automation: 'Sent confirmation email'
      }
    })

  } catch (error) {
    console.error('Error processing calendar booking:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get available time slots
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const service = searchParams.get('service')

    // Azure can help with:
    // 1. Natural language date parsing
    // 2. Service availability checking
    // 3. Time zone handling
    // 4. Recurring appointment patterns

    const availableSlots = [
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: false },
      { time: '14:00', available: true },
      { time: '15:00', available: true },
      { time: '16:00', available: false }
    ]

    return NextResponse.json({
      success: true,
      date: date || 'today',
      service: service || 'general',
      available_slots: availableSlots,
      azure_capabilities: {
        natural_language_date_parsing: true,
        service_availability_checking: true,
        time_zone_handling: true,
        recurring_appointment_patterns: true,
        conflict_detection: true
      }
    })

  } catch (error) {
    console.error('Error getting available slots:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
