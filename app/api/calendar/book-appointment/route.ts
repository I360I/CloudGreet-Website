import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'


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
    const { 
      calendarId, 
      startTime, 
      endTime, 
      summary, 
      description, 
      attendeeEmail,
      timeZone = 'America/New_York',
      location,
      customerName,
      customerPhone,
      serviceType
    } = await request.json()

    if (!calendarId || !startTime || !endTime || !summary) {
      return NextResponse.json(
        { error: 'Missing required parameters: calendarId, startTime, endTime, summary' },
        { status: 400 }
      )
    }

    // Initialize Google Calendar API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    const calendar = google.calendar({ version: 'v3', auth })

    // Create the event
    const event = {
      summary,
      description: description || `Appointment with ${customerName || 'Customer'}\nPhone: ${customerPhone || 'N/A'}\nService: ${serviceType || 'General Service'}`,
      start: {
        dateTime: startTime,
        timeZone,
      },
      end: {
        dateTime: endTime,
        timeZone,
      },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      location: location || '',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
    }

    // Insert the event
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    })

    const createdEvent = response.data

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        summary: createdEvent.summary,
        start: createdEvent.start,
        end: createdEvent.end,
        htmlLink: createdEvent.htmlLink,
        hangoutLink: createdEvent.hangoutLink,
        attendees: createdEvent.attendees,
        location: createdEvent.location,
      },
      message: 'Appointment booked successfully'
    })

  } catch (error) {
    console.error('Error booking appointment:', error)
    return NextResponse.json(
      { error: 'Failed to book appointment' },
      { status: 500 }
    )
  }
}
