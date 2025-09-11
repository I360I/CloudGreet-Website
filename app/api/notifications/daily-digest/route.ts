import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, businessName } = body

    // Simulate sending daily digest email
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const digestData = {
      date: yesterday.toLocaleDateString(),
      calls: {
        total: 12,
        answered: 11,
        missed: 1
      },
      bookings: {
        total: 8,
        confirmed: 7,
        pending: 1
      },
      revenue: {
        estimated: 1200,
        averageJobValue: 150
      },
      forwarded: {
        count: 3,
        reasons: ['Language barrier', 'Complex technical issue', 'Customer complaint']
      },
      spam: {
        blocked: 2,
        savings: 10
      },
      topServices: [
        { name: 'HVAC Repair', count: 5 },
        { name: 'Installation', count: 2 },
        { name: 'Emergency', count: 1 }
      ]
    }

    // In production, this would send an actual email
    console.log(`Daily digest sent to ${email} for ${businessName}:`, digestData)

    return NextResponse.json({
      success: true,
      message: 'Daily digest email sent successfully',
      data: digestData
    })
  } catch (error) {
    console.error('Error sending daily digest:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send daily digest' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return digest settings and preview
    const digestSettings = {
      enabled: true,
      recipients: ['owner@business.com'],
      time: '08:00',
      format: 'summary',
      lastSent: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      preview: {
        subject: "Daily CloudGreet Summary - Yesterday's Activity",
        content: "Yesterday: 12 calls, 8 bookings, $1,200 est. revenue. 3 calls forwarded to you."
      }
    }

    return NextResponse.json({
      success: true,
      data: digestSettings
    })
  } catch (error) {
    console.error('Error fetching digest settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch digest settings' },
      { status: 500 }
    )
  }
}

