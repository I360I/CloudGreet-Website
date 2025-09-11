import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')
    const userId = searchParams.get('userId')

    validateUserId(userId)

    if (!callId) {
      return NextResponse.json({
        success: false,
        error: 'Call ID is required'
      }, { status: 400 })
    }

    // Initialize Retell API
    const retellApiKey = process.env.RETELL_API_KEY
    if (!retellApiKey || retellApiKey.includes('your-') || retellApiKey.includes('demo-')) {
      return NextResponse.json({
        success: false,
        error: 'Retell AI API key not configured. Please set RETELL_API_KEY in environment variables.'
      }, { status: 503 })
    }

    // Verify call belongs to user
    const { data: userCall, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('call_id', callId)
      .eq('user_id', userId)
      .single()

    if (callError || !userCall) {
      return NextResponse.json({
        success: false,
        error: 'Call not found or access denied'
      }, { status: 404 })
    }

    // Fetch real call details from Retell API
    const retellResponse = await fetch(`https://api.retellai.com/v2/get-call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!retellResponse.ok) {
      throw new Error(`Retell API error: ${retellResponse.status}`)
    }

    const callData = await retellResponse.json()
    
    // Transform Retell data to our format
    const transformedCall = {
      id: callData.call_id,
      phoneNumber: callData.customer_phone_number,
      agentId: callData.agent_id,
      startTime: callData.start_timestamp,
      endTime: callData.end_timestamp,
      duration: callData.duration,
      status: callData.status,
      recording: {
        url: callData.recording_url,
        duration: callData.duration,
        format: 'mp3',
        size: callData.recording_size || 'Unknown',
        quality: 'high'
      },
      transcription: {
        available: !!callData.transcript,
        text: callData.transcript || '',
        confidence: callData.transcript_confidence || 0,
        language: callData.language || 'en-US',
        wordCount: callData.transcript ? callData.transcript.split(' ').length : 0
      },
      analytics: {
        sentiment: {
          overall: callData.sentiment_overall || 'neutral',
          score: callData.sentiment_score || 0.5,
          emotions: {
            satisfaction: callData.satisfaction_score || 0.5,
            frustration: callData.frustration_score || 0.1,
            confusion: callData.confusion_score || 0.1
          }
        },
        keywords: callData.keywords || [],
        topics: callData.topics || [],
        callQuality: {
          clarity: callData.clarity_score || 90,
          backgroundNoise: callData.background_noise_score || 10,
          interruptions: callData.interruption_count || 0
        },
        conversationFlow: {
          agentTurns: callData.agent_turns || 0,
          customerTurns: callData.customer_turns || 0,
          averageResponseTime: callData.avg_response_time || 0,
          silenceTime: calculateSilenceTime(callData),
          talkTime: {
            agent: callData.agent_talk_time || 0,
            customer: callData.customer_talk_time || 0
          }
        }
      },
      insights: {
        customerSatisfaction: determineCustomerSatisfaction(callData),
        bookingProbability: callData.booking_probability || 0,
        followUpRequired: callData.follow_up_required || false,
        recommendedActions: generateRecommendedActions(callData),
        urgency: determineUrgency(callData.transcript || ''),
        businessImpact: calculateBusinessImpact(callData)
      },
      metadata: {
        cost: callData.cost || 0,
        region: callData.region || 'US',
        timezone: callData.timezone || 'UTC',
        createdAt: callData.created_at,
        updatedAt: new Date().toISOString()
      }
    }

    // Store enhanced call details in database
    await supabase
      .from('call_analytics')
      .upsert({
        call_id: callId,
        user_id: userId,
        sentiment_overall: transformedCall.analytics.sentiment.overall,
        sentiment_score: transformedCall.analytics.sentiment.score,
        satisfaction_score: transformedCall.analytics.sentiment.emotions.satisfaction,
        frustration_score: transformedCall.analytics.sentiment.emotions.frustration,
        confusion_score: transformedCall.analytics.sentiment.emotions.confusion,
        keywords: transformedCall.analytics.keywords,
        topics: transformedCall.analytics.topics,
        clarity_score: transformedCall.analytics.callQuality.clarity,
        background_noise_score: transformedCall.analytics.callQuality.backgroundNoise,
        interruption_count: transformedCall.analytics.callQuality.interruptions,
        customer_satisfaction: transformedCall.insights.customerSatisfaction,
        booking_probability: transformedCall.insights.bookingProbability,
        follow_up_required: transformedCall.insights.followUpRequired,
        recommended_actions: transformedCall.insights.recommendedActions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'call_id' })

    return createSuccessResponse({ callDetails: transformedCall })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callId, userId, action, data } = body

    validateUserId(userId)

    if (!callId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Call ID and action are required'
      }, { status: 400 })
    }

    // Verify call belongs to user
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('call_id', callId)
      .eq('user_id', userId)
      .single()

    if (callError || !call) {
      return NextResponse.json({
        success: false,
        error: 'Call not found or access denied'
      }, { status: 404 })
    }

    switch (action) {
      case 'update_insights':
        const { error: insightsError } = await supabase
          .from('call_analytics')
          .update({
            customer_satisfaction: data.customerSatisfaction,
            booking_probability: data.bookingProbability,
            follow_up_required: data.followUpRequired,
            recommended_actions: data.recommendedActions,
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        if (insightsError) {
          throw new Error('Failed to update call insights')
        }

        return createSuccessResponse({
          message: 'Call insights updated successfully'
        })

      case 'add_notes':
        const { error: notesError } = await supabase
          .from('calls')
          .update({
            notes: data.notes,
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        if (notesError) {
          throw new Error('Failed to add notes')
        }

        return createSuccessResponse({
          message: 'Notes added successfully'
        })

      case 'mark_resolved':
        const { error: resolvedError } = await supabase
          .from('calls')
          .update({
            status: 'resolved',
            resolution_notes: data.notes,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        if (resolvedError) {
          throw new Error('Failed to mark call as resolved')
        }

        return createSuccessResponse({
          message: 'Call marked as resolved'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

  } catch (error) {
    return handleApiError(error)
  }
}

// Helper functions
function calculateSilenceTime(callData: any): number {
  const duration = callData.duration || 0
  const agentTalkTime = callData.agent_talk_time || 0
  const customerTalkTime = callData.customer_talk_time || 0
  return Math.max(0, duration - agentTalkTime - customerTalkTime)
}

function determineCustomerSatisfaction(callData: any): string {
  const sentimentScore = callData.sentiment_score || 0.5
  const satisfactionScore = callData.satisfaction_score || 0.5
  
  if (sentimentScore > 0.7 && satisfactionScore > 0.7) return 'high'
  if (sentimentScore > 0.4 && satisfactionScore > 0.4) return 'medium'
  return 'low'
}

function generateRecommendedActions(callData: any): string[] {
  const actions = []
  const transcript = callData.transcript || ''
  const sentimentScore = callData.sentiment_score || 0.5
  
  if (sentimentScore < 0.3) {
    actions.push('follow_up_apology')
  }
  
  if (transcript.includes('appointment') || transcript.includes('schedule')) {
    actions.push('schedule_appointment')
  }
  
  if (transcript.includes('quote') || transcript.includes('price')) {
    actions.push('send_quote')
  }
  
  if (transcript.includes('emergency') || transcript.includes('urgent')) {
    actions.push('priority_response')
  }
  
  return actions
}

function determineUrgency(transcript: string): string {
  const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately', 'leak', 'broken']
  const lowerTranscript = transcript.toLowerCase()
  
  if (urgentKeywords.some(keyword => lowerTranscript.includes(keyword))) {
    return 'high'
  }
  
  if (lowerTranscript.includes('soon') || lowerTranscript.includes('quickly')) {
    return 'medium'
  }
  
  return 'low'
}

function calculateBusinessImpact(callData: any): string {
  const bookingProbability = callData.booking_probability || 0
  const sentimentScore = callData.sentiment_score || 0.5
  
  if (bookingProbability > 0.8 && sentimentScore > 0.6) return 'high'
  if (bookingProbability > 0.5 || sentimentScore > 0.4) return 'medium'
  return 'low'
}