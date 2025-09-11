import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    // Simulate available slots
    const availableSlots = [
      {
        start: `${date}T09:00:00.000Z`,
        end: `${date}T10:00:00.000Z`,
        startTime: '09:00 AM',
        endTime: '10:00 AM',
        duration: 60
      },
      {
        start: `${date}T10:30:00.000Z`,
        end: `${date}T11:30:00.000Z`,
        startTime: '10:30 AM',
        endTime: '11:30 AM',
        duration: 60
      },
      {
        start: `${date}T14:00:00.000Z`,
        end: `${date}T15:00:00.000Z`,
        startTime: '02:00 PM',
        endTime: '03:00 PM',
        duration: 60
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        available: true,
        availableSlots,
        date,
        businessHours: { start: '09:00', end: '17:00' },
        workingDays: [1, 2, 3, 4, 5],
        totalSlots: availableSlots.length
      }
    })
  } catch (error) {
    console.error('Error getting available slots:', error)
    return NextResponse.json(
      { error: 'Failed to get available time slots' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      calendarId, 
      date, 
      duration = 60, // duration in minutes
      timeZone = 'America/New_York',
      businessHours = { start: '09:00', end: '17:00' },
      workingDays = [1, 2, 3, 4, 5] // Monday to Friday
    } = await request.json()

    if (!calendarId || !date) {
      return NextResponse.json(
        { error: 'Missing required parameters: calendarId, date' },
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

    // Get the start and end of the day
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Check if the requested date is a working day
    const dayOfWeek = startOfDay.getDay()
    if (!workingDays.includes(dayOfWeek)) {
      return NextResponse.json({
        available: false,
        message: 'Requested date is not a working day',
        availableSlots: []
      })
    }

    // Get existing events for the day
    const response = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = response.data.items || []
    
    // Generate available time slots
    const availableSlots = []
    const [startHour, startMinute] = businessHours.start.split(':').map(Number)
    const [endHour, endMinute] = businessHours.end.split(':').map(Number)
    
    const businessStart = new Date(startOfDay)
    businessStart.setHours(startHour, startMinute, 0, 0)
    
    const businessEnd = new Date(startOfDay)
    businessEnd.setHours(endHour, endMinute, 0, 0)

    // Create time slots every 30 minutes
    const slotInterval = 30 // minutes
    let currentTime = new Date(businessStart)

    while (currentTime < businessEnd) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000)
      
      // Check if this slot conflicts with existing events
      const hasConflict = events.some(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '')
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '')
        
        return (
          (currentTime >= eventStart && currentTime < eventEnd) ||
          (slotEnd > eventStart && slotEnd <= eventEnd) ||
          (currentTime <= eventStart && slotEnd >= eventEnd)
        )
      })

      if (!hasConflict && slotEnd <= businessEnd) {
        availableSlots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
          startTime: currentTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone 
          }),
          endTime: slotEnd.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone 
          }),
          duration: duration
        })
      }

      currentTime = new Date(currentTime.getTime() + slotInterval * 60000)
    }

    return NextResponse.json({
      available: availableSlots.length > 0,
      availableSlots,
      date,
      businessHours,
      workingDays,
      totalSlots: availableSlots.length
    })

  } catch (error) {
    console.error('Error getting available slots:', error)
    return NextResponse.json(
      { error: 'Failed to get available time slots' },
      { status: 500 }
    )
  }
}
