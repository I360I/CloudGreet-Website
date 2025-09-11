import { NextRequest, NextResponse } from "next/server"
import { sendCallSummaryEmail, sendNewBookingNotification } from '../../../lib/email'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10')

    // If no userId provided, return error
    if (!userId || userId === 'undefined') {
      return NextResponse.json({
        success: false,
        error: 'User ID is required to fetch call logs'
      }, { status: 400 })
    }

    // In a real implementation, this would:
    // 1. Fetch call logs from your database
    // 2. Filter by user ID
    // 3. Return paginated results
    // 4. Include call recordings, transcripts, etc.

    // Fetch real call logs from database
    const { data: callLogs, error } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching call logs:', error)
      return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      callLogs,
      total: 0,
      hasMore: false
    })

  } catch (error) {
    console.error('Error fetching call logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, callData } = body

    if (!userId || !callData) {
      return NextResponse.json(
        { error: 'User ID and call data are required' },
        { status: 400 }
      )
    }

    // In a real implementation, this would:
    // 1. Save call log to database
    // 2. Process call recording/transcript
    // 3. Update user statistics
    // 4. Send notifications if needed

    const newCallLog = {
      id: Date.now().toString(),
      userId,
      ...callData,
      timestamp: new Date().toISOString()
    }

    // Send email notification for new bookings
    if (callData.outcome === 'booked') {
      try {
        // Get user details to send email
        const userResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/get-user-data?userId=${userId}`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          await sendNewBookingNotification(
            userData.user.email,
            {
              customerName: callData.customerName || 'Unknown',
              customerPhone: callData.callerNumber,
              service: callData.service || 'General Service',
              date: callData.bookingDate || 'TBD',
              time: callData.bookingTime || 'TBD',
              value: callData.estimatedValue || 0
            }
          )
        }
      } catch (emailError) {
        console.error('Failed to send booking notification email:', emailError)
        // Don't fail the call log save if email fails
      }
    }

    // Send call summary email for all calls
    try {
      const userResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/get-user-data?userId=${userId}`)
      if (userResponse.ok) {
        const userData = await userResponse.json()
        await sendCallSummaryEmail(
          userData.user.email,
          {
            callerNumber: callData.callerNumber,
            duration: callData.duration,
            outcome: callData.outcome,
            timestamp: newCallLog.timestamp,
            transcript: callData.transcript
          }
        )
      }
    } catch (emailError) {
      console.error('Failed to send call summary email:', emailError)
      // Don't fail the call log save if email fails
    }

    return NextResponse.json({
      success: true,
      callLog: newCallLog
    })

  } catch (error) {
    console.error('Error saving call log:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
