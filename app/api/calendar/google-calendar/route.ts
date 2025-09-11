import { NextRequest, NextResponse } from 'next/server'

interface GoogleCalendarBooking {
  customer_name: string
  customer_email: string
  customer_phone: string
  service_type: string
  preferred_date: string
  preferred_time: string
  duration: number
  notes?: string
  calendar_id?: string
}


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    return NextResponse.json({
      success: true,
      data: {
        status: 'ready',
        message: 'Service is ready'
      }
    });
  } catch (error) {
    console.error('Error in GET method:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get service status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const bookingData: GoogleCalendarBooking = await request.json()
    
    console.log('Creating Google Calendar event:', bookingData)

    // Validate required fields
    if (!bookingData.customer_name || !bookingData.customer_email || !bookingData.service_type) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Customer name, email, and service type are required'
      }, { status: 400 })
    }

    // Google Calendar API configuration
    const googleApiKey = process.env.GOOGLE_CALENDAR_API_KEY
    const googleClientId = process.env.GOOGLE_CLIENT_ID
    
    if (!googleApiKey || !googleClientId || 
        googleApiKey.includes('your-') || 
        googleClientId.includes('your-')) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar API not configured. Please set GOOGLE_CALENDAR_API_KEY and GOOGLE_CLIENT_ID in environment variables.'
      }, { status: 503 })
    }

    // Create Google Calendar event
    const event = {
      summary: `${bookingData.service_type} - ${bookingData.customer_name}`,
      description: `Service: ${bookingData.service_type}\nCustomer: ${bookingData.customer_name}\nPhone: ${bookingData.customer_phone}\nNotes: ${bookingData.notes || 'None'}`,
      start: {
        dateTime: `${bookingData.preferred_date}T${bookingData.preferred_time}:00`,
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: `${bookingData.preferred_date}T${bookingData.preferred_time}:00`,
        timeZone: 'America/New_York'
      },
      attendees: [
        { email: bookingData.customer_email, displayName: bookingData.customer_name }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 }
        ]
      }
    }

    // In a real implementation, you would use the Google Calendar API
    // For now, we'll simulate the API call
    const calendarResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${bookingData.calendar_id || 'primary'}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    })

    if (!calendarResponse.ok) {
      throw new Error(`Google Calendar API error: ${calendarResponse.statusText}`)
    }

    const createdEvent = await calendarResponse.json()

    return NextResponse.json({
      success: true,
      event_id: createdEvent.id,
      event: {
        id: createdEvent.id,
        summary: createdEvent.summary,
        start: createdEvent.start,
        end: createdEvent.end,
        attendees: createdEvent.attendees,
        htmlLink: createdEvent.htmlLink
      },
      message: 'Google Calendar event created successfully'
    })

  } catch (error) {
    console.error('Google Calendar API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create calendar event',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}