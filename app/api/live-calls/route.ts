import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    validateUserId(userId)

    // Fetch active calls for the user
    const { data: activeCalls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (callsError) {
      throw new Error('Failed to fetch active calls')
    }

    // Get call statistics
    const { data: callStats, error: statsError } = await supabase
      .from('calls')
      .select('status, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    if (statsError) {
      throw new Error('Failed to fetch call statistics')
    }

    const stats = {
      activeCalls: activeCalls?.length || 0,
      totalCallsToday: callStats?.length || 0,
      completedCallsToday: callStats?.filter(call => call.status === 'completed').length || 0,
      averageCallDuration: calculateAverageCallDuration(activeCalls || [])
    }

    return createSuccessResponse({
      activeCalls: activeCalls || [],
      stats
    })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, callData, action } = body

    validateUserId(userId)

    if (!callData) {
      return NextResponse.json({
        success: false,
        error: 'Call data is required'
      }, { status: 400 })
    }

    // Process incoming call data (from Retell AI webhook)
    console.log('📞 Processing call data for user:', userId, callData)

    // Save call data to database
    const callRecord = {
      call_id: callData.call_id,
      user_id: userId,
      agent_id: callData.agent_id,
      customer_phone: callData.customer_phone,
      start_time: callData.start_time,
      end_time: callData.end_time,
      duration: callData.duration,
      status: callData.status || 'active',
      recording_url: callData.recording_url,
      transcription_url: callData.transcription_url,
      cost: callData.cost,
      metadata: {
        call_type: callData.call_type,
        outcome: callData.outcome,
        sentiment: callData.sentiment,
        booking_probability: callData.booking_probability,
        follow_up_required: callData.follow_up_required
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: savedCall, error: saveError } = await supabase
      .from('calls')
      .upsert(callRecord, { onConflict: 'call_id' })
      .select()
      .single()

    if (saveError) {
      throw new Error('Failed to save call data')
    }

    // Send real-time notifications
    await sendRealTimeNotifications(userId, callData, savedCall)

    // Update business stats
    await updateBusinessStats(userId, callData)

    // Handle specific actions
    if (action) {
      await handleCallAction(userId, callData, action)
    }

    return createSuccessResponse({
      message: 'Call data processed successfully',
      callId: savedCall.call_id,
      status: savedCall.status
    })

  } catch (error) {
    return handleApiError(error)
  }
}

async function sendRealTimeNotifications(userId: string, callData: any, savedCall: any) {
  try {
    // Create notification based on call outcome
    let notificationType = 'call_completed'
    let notificationTitle = 'Call Completed'
    let notificationMessage = `Call with ${callData.customer_phone} completed`
    let priority = 'medium'

    if (callData.status === 'active') {
      notificationType = 'call_started'
      notificationTitle = 'Call Started'
      notificationMessage = `Incoming call from ${callData.customer_phone}`
      priority = 'high'
    } else if (callData.booking_probability && callData.booking_probability > 0.8) {
      notificationType = 'high_value_lead'
      notificationTitle = 'High-Value Lead Detected'
      notificationMessage = `Call with ${callData.customer_phone} shows strong buying signals`
      priority = 'high'
    } else if (callData.follow_up_required) {
      notificationType = 'follow_up_required'
      notificationTitle = 'Follow-up Required'
      notificationMessage = `Follow-up needed for call with ${callData.customer_phone}`
      priority = 'medium'
    }

    // Store notification in database
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        priority: priority,
        metadata: {
          call_id: callData.call_id,
          customer_phone: callData.customer_phone,
          outcome: callData.outcome,
          booking_probability: callData.booking_probability
        },
        created_at: new Date().toISOString()
      })

    if (notificationError) {
      console.error('Failed to create notification:', notificationError)
    }

    // Send smart notification
    await supabase
      .from('smart_notifications')
      .insert({
        user_id: userId,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        priority: priority,
        metadata: {
          call_id: callData.call_id,
          customer_phone: callData.customer_phone,
          outcome: callData.outcome,
          booking_probability: callData.booking_probability
        },
        created_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error sending real-time notifications:', error)
  }
}

async function updateBusinessStats(userId: string, callData: any) {
  try {
    // Update user's call statistics
    const { data: userStats, error: statsError } = await supabase
      .from('analytics')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (statsError && statsError.code !== 'PGRST116') {
      throw new Error('Failed to fetch user stats')
    }

    const currentStats = userStats || {
      user_id: userId,
      total_calls: 0,
      successful_calls: 0,
      total_revenue: 0,
      conversion_rate: 0,
      created_at: new Date().toISOString()
    }

    // Update stats
    const updatedStats = {
      ...currentStats,
      total_calls: currentStats.total_calls + 1,
      successful_calls: callData.status === 'completed' ? currentStats.successful_calls + 1 : currentStats.successful_calls,
      conversion_rate: callData.status === 'completed' ? 
        ((currentStats.successful_calls + 1) / (currentStats.total_calls + 1)) * 100 : 
        currentStats.conversion_rate,
      updated_at: new Date().toISOString()
    }

    // Upsert analytics
    const { error: upsertError } = await supabase
      .from('analytics')
      .upsert(updatedStats, { onConflict: 'user_id' })

    if (upsertError) {
      throw new Error('Failed to update business stats')
    }

    // Update call analytics if available
    if (callData.sentiment || callData.booking_probability) {
      await supabase
        .from('call_analytics')
        .upsert({
          call_id: callData.call_id,
          user_id: userId,
          sentiment_overall: callData.sentiment?.overall,
          sentiment_score: callData.sentiment?.score,
          booking_probability: callData.booking_probability,
          follow_up_required: callData.follow_up_required,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'call_id' })
    }

  } catch (error) {
    console.error('Error updating business stats:', error)
  }
}

async function handleCallAction(userId: string, callData: any, action: string) {
  try {
    switch (action) {
      case 'end_call':
        // End the call
        await supabase
          .from('calls')
          .update({
            status: 'completed',
            end_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callData.call_id)
          .eq('user_id', userId)
        break

      case 'transfer_call':
        // Transfer call to human agent
        await supabase
          .from('calls')
          .update({
            status: 'transferred',
            metadata: {
              ...callData.metadata,
              transferred_to: 'human_agent',
              transfer_reason: 'customer_request'
            },
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callData.call_id)
          .eq('user_id', userId)
        break

      case 'schedule_follow_up':
        // Schedule follow-up
        await supabase
          .from('calls')
          .update({
            follow_up_required: true,
            follow_up_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callData.call_id)
          .eq('user_id', userId)
        break

      case 'add_notes':
        // Add notes to call
        await supabase
          .from('calls')
          .update({
            notes: callData.notes,
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callData.call_id)
          .eq('user_id', userId)
        break

      default:
        console.log('Unknown call action:', action)
    }
  } catch (error) {
    console.error('Error handling call action:', error)
  }
}

function calculateAverageCallDuration(activeCalls: any[]): number {
  if (activeCalls.length === 0) return 0
  
  const totalDuration = activeCalls.reduce((sum, call) => sum + (call.duration || 0), 0)
  return Math.round(totalDuration / activeCalls.length)
}