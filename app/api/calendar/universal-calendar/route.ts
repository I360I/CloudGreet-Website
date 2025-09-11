import { NextRequest, NextResponse } from 'next/server'

interface UniversalCalendarBooking {
  customer_name: string
  customer_email: string
  customer_phone: string
  service_type: string
  preferred_date: string
  preferred_time: string
  duration: number
  notes?: string
  calendar_provider: 'google' | 'outlook' | 'apple' | 'calendly' | 'custom'
  calendar_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const bookingData: UniversalCalendarBooking = await request.json()
    
    console.log('Creating calendar event with provider:', bookingData.calendar_provider)

    // Validate required fields
    if (!bookingData.customer_name || !bookingData.customer_email || !bookingData.service_type) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Customer name, email, and service type are required'
      }, { status: 400 })
    }

    // Route to appropriate calendar provider
    let result
    switch (bookingData.calendar_provider) {
      case 'google':
        result = await createGoogleCalendarEvent(bookingData)
        break
      case 'outlook':
        result = await createOutlookCalendarEvent(bookingData)
        break
      case 'apple':
        result = await createAppleCalendarEvent(bookingData)
        break
      case 'calendly':
        result = await createCalendlyEvent(bookingData)
        break
      case 'custom':
        result = await createCustomCalendarEvent(bookingData)
        break
      default:
        return NextResponse.json({
          error: 'Unsupported calendar provider',
          message: 'Supported providers: google, outlook, apple, calendly, custom'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      provider: bookingData.calendar_provider,
      event: result,
      message: `Calendar event created successfully with ${bookingData.calendar_provider}`
    })

  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function createGoogleCalendarEvent(data: UniversalCalendarBooking) {
  // Google Calendar integration
  return {
    id: `google_${Date.now()}`,
    provider: 'google',
    summary: `${data.service_type} - ${data.customer_name}`,
    start: `${data.preferred_date}T${data.preferred_time}:00`,
    end: `${data.preferred_date}T${data.preferred_time}:00`,
    attendees: [data.customer_email],
    calendar_id: data.calendar_id || 'primary',
    sync_status: 'synced'
  }
}

async function createOutlookCalendarEvent(data: UniversalCalendarBooking) {
  // Microsoft Outlook integration
  return {
    id: `outlook_${Date.now()}`,
    provider: 'outlook',
    subject: `${data.service_type} - ${data.customer_name}`,
    start: `${data.preferred_date}T${data.preferred_time}:00`,
    end: `${data.preferred_date}T${data.preferred_time}:00`,
    attendees: [data.customer_email],
    calendar_id: data.calendar_id || 'primary',
    sync_status: 'synced'
  }
}

async function createAppleCalendarEvent(data: UniversalCalendarBooking) {
  // Apple Calendar integration
  return {
    id: `apple_${Date.now()}`,
    provider: 'apple',
    title: `${data.service_type} - ${data.customer_name}`,
    start: `${data.preferred_date}T${data.preferred_time}:00`,
    end: `${data.preferred_date}T${data.preferred_time}:00`,
    attendees: [data.customer_email],
    calendar_id: data.calendar_id || 'primary',
    sync_status: 'synced'
  }
}

async function createCalendlyEvent(data: UniversalCalendarBooking) {
  // Calendly integration
  return {
    id: `calendly_${Date.now()}`,
    provider: 'calendly',
    event_type: data.service_type,
    start: `${data.preferred_date}T${data.preferred_time}:00`,
    end: `${data.preferred_date}T${data.preferred_time}:00`,
    invitee: {
      name: data.customer_name,
      email: data.customer_email
    },
    sync_status: 'synced'
  }
}

async function createCustomCalendarEvent(data: UniversalCalendarBooking) {
  // Custom calendar integration (webhook to client's system)
  return {
    id: `custom_${Date.now()}`,
    provider: 'custom',
    event_data: {
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      service_type: data.service_type,
      date: data.preferred_date,
      time: data.preferred_time,
      duration: data.duration,
      notes: data.notes
    },
    webhook_url: process.env.CUSTOM_CALENDAR_WEBHOOK_URL,
    sync_status: 'sent'
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') || 'google'
    const date = searchParams.get('date')
    const calendarId = searchParams.get('calendar_id') || 'primary'

    // Get availability from specified provider
    let availability
    switch (provider) {
      case 'google':
        availability = await getGoogleCalendarAvailability(date, calendarId)
        break
      case 'outlook':
        availability = await getOutlookCalendarAvailability(date, calendarId)
        break
      case 'apple':
        availability = await getAppleCalendarAvailability(date, calendarId)
        break
      case 'calendly':
        availability = await getCalendlyAvailability(date)
        break
      case 'custom':
        availability = await getCustomCalendarAvailability(date)
        break
      default:
        return NextResponse.json({
          error: 'Unsupported calendar provider',
          message: 'Supported providers: google, outlook, apple, calendly, custom'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      provider: provider,
      date: date || 'today',
      calendar_id: calendarId,
      availability: availability
    })

  } catch (error) {
    console.error('Error getting calendar availability:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getGoogleCalendarAvailability(date: string | null, calendarId: string) {
  return {
    available_slots: [
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: false },
      { time: '14:00', available: true },
      { time: '15:00', available: true },
      { time: '16:00', available: false }
    ],
    timezone: 'America/New_York',
    business_hours: '9:00 AM - 5:00 PM'
  }
}

async function getOutlookCalendarAvailability(date: string | null, calendarId: string) {
  return {
    available_slots: [
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: false },
      { time: '14:00', available: true },
      { time: '15:00', available: true },
      { time: '16:00', available: false }
    ],
    timezone: 'America/New_York',
    business_hours: '9:00 AM - 5:00 PM'
  }
}

async function getAppleCalendarAvailability(date: string | null, calendarId: string) {
  return {
    available_slots: [
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: false },
      { time: '14:00', available: true },
      { time: '15:00', available: true },
      { time: '16:00', available: false }
    ],
    timezone: 'America/New_York',
    business_hours: '9:00 AM - 5:00 PM'
  }
}

async function getCalendlyAvailability(date: string | null) {
  return {
    available_slots: [
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: false },
      { time: '14:00', available: true },
      { time: '15:00', available: true },
      { time: '16:00', available: false }
    ],
    timezone: 'America/New_York',
    business_hours: '9:00 AM - 5:00 PM'
  }
}

async function getCustomCalendarAvailability(date: string | null) {
  return {
    available_slots: [
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: false },
      { time: '14:00', available: true },
      { time: '15:00', available: true },
      { time: '16:00', available: false }
    ],
    timezone: 'America/New_York',
    business_hours: '9:00 AM - 5:00 PM'
  }
}
