import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    const body = await request.json()
    const { appointmentId, reminderType = '24h' } = body

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 })
    }

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('business_name, phone_number')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Send reminder SMS
    const reminderMessage = generateReminderMessage(appointment, business, reminderType)
    
    try {
      const smsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        },
        body: JSON.stringify({
          to: appointment.customer_phone,
          message: reminderMessage,
          businessId,
          type: 'appointment_reminder'
        })
      })

      if (smsResponse.ok) {
        // Log reminder sent
        await supabaseAdmin
          .from('appointment_reminders')
          .insert({
            appointment_id: appointmentId,
            business_id: businessId,
            reminder_type: reminderType,
            sent_at: new Date().toISOString(),
            status: 'sent'
          })

        logger.info('Appointment reminder sent', { 
          appointmentId, 
          customerPhone: appointment.customer_phone,
          reminderType 
        })

        return NextResponse.json({
          success: true,
          message: 'Reminder sent successfully'
        })
      } else {
        throw new Error('Failed to send reminder SMS')
      }
    } catch (smsError) {
      logger.error('Error sending appointment reminder', { 
        error: smsError instanceof Error ? smsError.message : 'Unknown error',
        appointmentId 
      })
      
      return NextResponse.json({ 
        error: 'Failed to send reminder' 
      }, { status: 500 })
    }

  } catch (error) {
    logger.error('Error processing appointment reminder', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process reminder' 
    }, { status: 500 })
  }
}

function generateReminderMessage(appointment: any, business: any, reminderType: string): string {
  const appointmentDate = new Date(appointment.scheduled_date)
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  let message = ''
  
  switch (reminderType) {
    case '24h':
      message = `Hi ${appointment.customer_name}! This is a reminder that you have an appointment with ${business.business_name} tomorrow (${formattedDate}) at ${formattedTime}. Please reply CONFIRM to confirm or RESCHEDULE to reschedule. Reply STOP to opt out.`
      break
    case '2h':
      message = `Hi ${appointment.customer_name}! Your appointment with ${business.business_name} is in 2 hours (${formattedTime}). We'll see you soon! Reply STOP to opt out.`
      break
    case '1h':
      message = `Hi ${appointment.customer_name}! Your appointment with ${business.business_name} is in 1 hour (${formattedTime}). We're looking forward to seeing you! Reply STOP to opt out.`
      break
    default:
      message = `Hi ${appointment.customer_name}! This is a reminder about your appointment with ${business.business_name} on ${formattedDate} at ${formattedTime}. Reply STOP to opt out.`
  }

  return message
}

// Auto-send reminders for upcoming appointments
export async function GET(request: NextRequest) {
  try {
    // This endpoint would be called by a cron job to auto-send reminders
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

    // Get appointments that need reminders
    const { data: appointments24h, error: error24h } = await supabaseAdmin
      .from('appointments')
      .select('*, businesses!inner(*)')
      .eq('status', 'scheduled')
      .gte('scheduled_date', tomorrow.toISOString().split('T')[0])
      .lt('scheduled_date', new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    const { data: appointments2h, error: error2h } = await supabaseAdmin
      .from('appointments')
      .select('*, businesses!inner(*)')
      .eq('status', 'scheduled')
      .gte('scheduled_date', twoHoursFromNow.toISOString())
      .lt('scheduled_date', new Date(twoHoursFromNow.getTime() + 2 * 60 * 60 * 1000).toISOString())

    const { data: appointments1h, error: error1h } = await supabaseAdmin
      .from('appointments')
      .select('*, businesses!inner(*)')
      .eq('status', 'scheduled')
      .gte('scheduled_date', oneHourFromNow.toISOString())
      .lt('scheduled_date', new Date(oneHourFromNow.getTime() + 60 * 60 * 1000).toISOString())

    // Send 24h reminders
    if (appointments24h) {
      for (const appointment of appointments24h) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/appointments/reminders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.JWT_SECRET}`
            },
            body: JSON.stringify({
              appointmentId: appointment.id,
              businessId: appointment.business_id,
              reminderType: '24h'
            })
          })
        } catch (error) {
          logger.error('Error sending 24h reminder', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            appointmentId: appointment.id 
          })
        }
      }
    }

    // Send 2h reminders
    if (appointments2h) {
      for (const appointment of appointments2h) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/appointments/reminders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.JWT_SECRET}`
            },
            body: JSON.stringify({
              appointmentId: appointment.id,
              businessId: appointment.business_id,
              reminderType: '2h'
            })
          })
        } catch (error) {
          logger.error('Error sending 2h reminder', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            appointmentId: appointment.id 
          })
        }
      }
    }

    // Send 1h reminders
    if (appointments1h) {
      for (const appointment of appointments1h) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/appointments/reminders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.JWT_SECRET}`
            },
            body: JSON.stringify({
              appointmentId: appointment.id,
              businessId: appointment.business_id,
              reminderType: '1h'
            })
          })
        } catch (error) {
          logger.error('Error sending 1h reminder', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            appointmentId: appointment.id 
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reminders processed',
      counts: {
        '24h': appointments24h?.length || 0,
        '2h': appointments2h?.length || 0,
        '1h': appointments1h?.length || 0
      }
    })

  } catch (error) {
    logger.error('Error processing auto reminders', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process reminders' 
    }, { status: 500 })
  }
}
