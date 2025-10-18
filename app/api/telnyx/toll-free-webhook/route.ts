import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/monitoring'
import { sendEmail } from '@/lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    logger.info('Toll-free verification webhook received', { body })

    // Validate webhook structure
    if (!body.data || !body.data.event_type) {
      logger.error('Invalid Telnyx toll-free webhook structure', { body })
      return NextResponse.json({ error: 'Invalid webhook structure' }, { status: 400 })
    }

    const {
      data: {
        event_type,
        payload
      }
    } = body

    // Handle different event types
    if (event_type === 'messaging_profile.toll_free_verification.completed') {
      await handleVerificationCompleted(payload)
    } else if (event_type === 'messaging_profile.toll_free_verification.failed') {
      await handleVerificationFailed(payload)
    } else if (event_type === 'messaging_profile.toll_free_verification.pending') {
      await handleVerificationPending(payload)
    } else {
      logger.info('Unhandled toll-free webhook event type', { event_type })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully'
    })

  } catch (error) {
    logger.error('Error processing toll-free webhook', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ 
      error: 'Failed to process webhook' 
    }, { status: 500 })
  }
}

async function handleVerificationCompleted(payload: any) {
  const phoneNumber = payload.phone_number || payload.toll_free_number
  
  if (!phoneNumber) {
    logger.error('No phone number in verification completed payload', { payload })
    return
  }

  logger.info('Toll-free verification completed', { phoneNumber })

  // Update database
  const { data: updatedNumber, error: updateError } = await supabaseAdmin
    .from('toll_free_numbers')
    .update({
      verification_status: 'verified',
      verification_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('number', phoneNumber)
    .select('*, businesses(*)')
    .single()

  if (updateError) {
    logger.error('Failed to update toll-free verification status', { 
      error: updateError,
      phoneNumber 
    })
    return
  }

  logger.info('Toll-free number verified in database', { 
    phoneNumber,
    businessId: updatedNumber?.business_id 
  })

  // Send email notification to admin
  try {
    await sendEmail({
      to: process.env.NOTIFICATION_EMAIL || 'admin@cloudgreet.com',
      subject: '✅ Toll-Free Number Verified',
      html: `
        <h2>Toll-Free Number Verified!</h2>
        <p><strong>Number:</strong> ${phoneNumber}</p>
        <p><strong>Status:</strong> Verified and ready for SMS</p>
        ${updatedNumber?.business_id ? `
          <p><strong>Assigned to:</strong> ${updatedNumber.businesses?.business_name || 'Client'}</p>
          <p>SMS is now active for this client!</p>
        ` : `
          <p><strong>Status:</strong> Available in pool</p>
          <p>This number is ready to be assigned to a new client.</p>
        `}
        <p>View in dashboard: <a href="https://cloudgreet.com/admin/phone-numbers">Phone Numbers</a></p>
      `
    })
  } catch (emailError) {
    logger.error('Failed to send verification email', { error: emailError })
  }

  // If assigned to a business, notify the client
  if (updatedNumber?.business_id && updatedNumber.businesses) {
    const business = updatedNumber.businesses
    
    // Get business owner email
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', business.user_id)
      .single()

    if (user?.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: '🎉 Your SMS is Now Active!',
          html: `
            <h2>Great News!</h2>
            <p>Your phone number <strong>${phoneNumber}</strong> has been verified and SMS is now fully active!</p>
            <h3>What This Means:</h3>
            <ul>
              <li>✅ Voice calls are working</li>
              <li>✅ SMS messages are working</li>
              <li>✅ Appointment confirmations will be sent</li>
              <li>✅ Missed call recovery is active</li>
              <li>✅ Two-way SMS conversations enabled</li>
            </ul>
            <p>Your AI receptionist is now fully operational!</p>
            <p><a href="https://cloudgreet.com/dashboard">View Dashboard</a></p>
          `
        })
      } catch (emailError) {
        logger.error('Failed to send client notification email', { error: emailError })
      }
    }
  }

  // Log event for admin dashboard
  await supabaseAdmin
    .from('system_events')
    .insert({
      event_type: 'toll_free_verified',
      event_data: {
        phone_number: phoneNumber,
        business_id: updatedNumber?.business_id,
        verified_at: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    })
}

async function handleVerificationFailed(payload: any) {
  const phoneNumber = payload.phone_number || payload.toll_free_number
  const reason = payload.reason || payload.failure_reason || 'Unknown reason'
  
  if (!phoneNumber) {
    logger.error('No phone number in verification failed payload', { payload })
    return
  }

  logger.warn('Toll-free verification failed', { phoneNumber, reason })

  // Update database
  await supabaseAdmin
    .from('toll_free_numbers')
    .update({
      verification_status: 'rejected',
      verification_failure_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('number', phoneNumber)

  // Send email notification to admin
  try {
    await sendEmail({
      to: process.env.NOTIFICATION_EMAIL || 'admin@cloudgreet.com',
      subject: '❌ Toll-Free Verification Failed',
      html: `
        <h2>Toll-Free Verification Failed</h2>
        <p><strong>Number:</strong> ${phoneNumber}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Action Required:</strong> Review and resubmit verification</p>
        <p>View in dashboard: <a href="https://cloudgreet.com/admin/phone-numbers">Phone Numbers</a></p>
      `
    })
  } catch (emailError) {
    logger.error('Failed to send verification failure email', { error: emailError })
  }

  // Log event for admin dashboard
  await supabaseAdmin
    .from('system_events')
    .insert({
      event_type: 'toll_free_verification_failed',
      event_data: {
        phone_number: phoneNumber,
        reason: reason,
        failed_at: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    })
}

async function handleVerificationPending(payload: any) {
  const phoneNumber = payload.phone_number || payload.toll_free_number
  
  if (!phoneNumber) {
    logger.error('No phone number in verification pending payload', { payload })
    return
  }

  logger.info('Toll-free verification pending', { phoneNumber })

  // Update database
  await supabaseAdmin
    .from('toll_free_numbers')
    .update({
      verification_status: 'pending',
      verification_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('number', phoneNumber)

  // Log event for admin dashboard
  await supabaseAdmin
    .from('system_events')
    .insert({
      event_type: 'toll_free_verification_pending',
      event_data: {
        phone_number: phoneNumber,
        submitted_at: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    })
}

