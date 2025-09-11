import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    // In a real app, you would fetch this from your database
    // For now, return mock calendar settings
    const calendarSettings = {
      userId,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      businessHours: {
        start: '09:00',
        end: '17:00',
        timeZone: 'America/New_York'
      },
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      defaultDuration: 60, // minutes
      bufferTime: 15, // minutes between appointments
      autoConfirm: true,
      sendReminders: true,
      reminderTimes: [24 * 60, 30], // 24 hours and 30 minutes before
      services: [
        { name: 'HVAC Service', duration: 90 },
        { name: 'Painting Consultation', duration: 60 },
        { name: 'Roofing Inspection', duration: 120 },
        { name: 'General Consultation', duration: 30 }
      ],
      isConnected: !!process.env.GOOGLE_CALENDAR_CLIENT_EMAIL
    }

    return NextResponse.json(calendarSettings)

  } catch (error) {
    console.error('Error getting calendar settings:', error)
    return NextResponse.json(
      { error: 'Failed to get calendar settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, settings } = await request.json()

    if (!userId || !settings) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, settings' },
        { status: 400 }
      )
    }

    // In a real app, you would save this to your database
    // For now, just return success
    const updatedSettings = {
      userId,
      ...settings,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Calendar settings updated successfully'
    })

  } catch (error) {
    console.error('Error updating calendar settings:', error)
    return NextResponse.json(
      { error: 'Failed to update calendar settings' },
      { status: 500 }
    )
  }
}
