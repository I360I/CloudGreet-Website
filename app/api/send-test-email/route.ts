import { NextRequest, NextResponse } from "next/server"
import { sendWelcomeEmail, sendOnboardingCompleteEmail, sendNewBookingNotification, sendCallSummaryEmail } from '../../../lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, type, testData } = body

    if (!email || !type) {
      return NextResponse.json(
        { error: 'Email and type are required' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'welcome':
        result = await sendWelcomeEmail(email, { name: testData?.name || 'Test User' })
        break

      case 'onboarding':
        result = await sendOnboardingCompleteEmail(
          email, 
          {
            ownerName: testData?.name || 'Test User',
            phoneNumber: testData?.phoneNumber || '+1 (555) 123-4567'
          }
        )
        break

      case 'booking':
        result = await sendNewBookingNotification(
          email,
          {
            customerName: testData?.customerName || 'John Doe',
            customerPhone: testData?.customerPhone || '+1 (555) 987-6543',
            service: testData?.service || 'HVAC Repair',
            date: testData?.date || 'Tomorrow',
            time: testData?.time || '2:00 PM',
            value: testData?.value || 350
          }
        )
        break

      case 'call':
        result = await sendCallSummaryEmail(
          email,
          {
            callerNumber: testData?.callerNumber || '+1 (555) 987-6543',
            duration: testData?.duration || '3:45',
            outcome: testData?.outcome || 'booked',
            timestamp: new Date().toISOString(),
            transcript: testData?.transcript || 'Customer called about HVAC repair. Scheduled appointment for tomorrow at 2 PM.'
          }
        )
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `${type} email sent successfully`,
      result
    })

  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

