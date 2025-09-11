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
    const { calendarId, startTime, endTime, timeZone = 'America/New_York' } = await request.json()

    if (!calendarId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required parameters: calendarId, startTime, endTime' },
        { status: 400 }
      )
    }

    // Initialize Google Calendar API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })

    const calendar = google.calendar({ version: 'v3', auth })

    // Check for existing events in the time range
    const response = await calendar.events.list({
      calendarId,
      timeMin: startTime,
      timeMax: endTime,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = response.data.items || []
    
    // Check if the time slot is available
    const isAvailable = events.length === 0

    return NextResponse.json({
      available: isAvailable,
      events: events.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start,
        end: event.end,
        status: event.status,
      })),
      timeSlot: {
        start: startTime,
        end: endTime,
        timeZone,
      }
    })

  } catch (error) {
    console.error('Error checking calendar availability:', error)
    return NextResponse.json(
      { error: 'Failed to check calendar availability' },
      { status: 500 }
    )
  }
}
