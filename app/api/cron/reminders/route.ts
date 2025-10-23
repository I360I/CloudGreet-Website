import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

// Cron job endpoint for appointment reminders
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Starting appointment reminder cron job')

    // Call the appointment reminders endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/appointments/reminders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.JWT_SECRET}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      logger.info('Appointment reminders processed', { 
        counts: data.counts 
      })
      
      return NextResponse.json({
        success: true,
        message: 'Reminders processed successfully',
        counts: data.counts
      })
    } else {
      throw new Error('Failed to process reminders')
    }

  } catch (error) {
    logger.error('Cron job error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process reminders' 
    }, { status: 500 })
  }
}
