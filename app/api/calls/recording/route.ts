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

    // Fetch real call recording data from database
    const { data: callRecording, error: recordingError } = await supabase
      .from('call_recordings')
      .select('*')
      .eq('call_id', callId)
      .eq('user_id', userId)
      .single()

    if (recordingError) {
      throw new Error('Call recording not found')
    }

    // Fetch call analytics if available
    const { data: callAnalytics, error: analyticsError } = await supabase
      .from('call_analytics')
      .select('*')
      .eq('call_id', callId)
      .eq('user_id', userId)
      .single()

    const recordingData = {
      callId: callRecording.call_id,
      userId: callRecording.user_id,
      recording: {
        url: callRecording.recording_url,
        duration: callRecording.duration,
        format: callRecording.format,
        size: callRecording.file_size,
        quality: callRecording.quality,
        transcription: {
          available: !!callRecording.transcription_url,
          url: callRecording.transcription_url,
          accuracy: callRecording.transcription_accuracy,
          language: callRecording.language,
          wordCount: callRecording.word_count
        }
      },
      analytics: callAnalytics ? {
        sentiment: {
          overall: callAnalytics.sentiment_overall,
          score: callAnalytics.sentiment_score,
          emotions: {
            satisfaction: callAnalytics.satisfaction_score,
            frustration: callAnalytics.frustration_score,
            confusion: callAnalytics.confusion_score
          }
        },
        keywords: callAnalytics.keywords || [],
        topics: callAnalytics.topics || [],
        callQuality: {
          clarity: callAnalytics.clarity_score,
          backgroundNoise: callAnalytics.background_noise_score,
          interruptions: callAnalytics.interruption_count
        }
      } : null,
      insights: {
        customerSatisfaction: callAnalytics?.customer_satisfaction || 'unknown',
        bookingProbability: callAnalytics?.booking_probability || 0,
        followUpRequired: callAnalytics?.follow_up_required || false,
        recommendedActions: callAnalytics?.recommended_actions || []
      },
      metadata: {
        createdAt: callRecording.created_at,
        updatedAt: callRecording.updated_at,
        retentionPolicy: callRecording.retention_policy,
        complianceStatus: callRecording.compliance_status
      }
    }

    return createSuccessResponse({ recordingData })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callId, action, userId } = body

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
      .select('id')
      .eq('id', callId)
      .eq('user_id', userId)
      .single()

    if (callError || !call) {
      return NextResponse.json({
        success: false,
        error: 'Call not found or access denied'
      }, { status: 404 })
    }

    switch (action) {
      case 'download':
        // Generate secure download link
        const { data: downloadToken, error: tokenError } = await supabase
          .from('download_tokens')
          .insert({
            call_id: callId,
            user_id: userId,
            action: 'download',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (tokenError) {
          throw new Error('Failed to generate download token')
        }

        return createSuccessResponse({
          callId,
          downloadUrl: `${process.env.NEXTAUTH_URL}/api/calls/recording/download?token=${downloadToken.id}`,
          expiresAt: downloadToken.expires_at,
          format: 'mp3'
        })

      case 'share':
        // Generate shareable link with access control
        const { data: shareToken, error: shareError } = await supabase
          .from('download_tokens')
          .insert({
            call_id: callId,
            user_id: userId,
            action: 'share',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (shareError) {
          throw new Error('Failed to generate share token')
        }

        return createSuccessResponse({
          callId,
          shareUrl: `${process.env.NEXTAUTH_URL}/call/${shareToken.id}`,
          expiresAt: shareToken.expires_at,
          accessLevel: 'view_only'
        })

      case 'delete':
        // Delete recording with compliance tracking
        const { error: deleteError } = await supabase
          .from('call_recordings')
          .update({
            deleted: true,
            deleted_at: new Date().toISOString(),
            compliance_reason: 'GDPR_Article_17',
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        if (deleteError) {
          throw new Error('Failed to delete recording')
        }

        // Log deletion for compliance
        await supabase
          .from('compliance_logs')
          .insert({
            user_id: userId,
            action: 'recording_deletion',
            call_id: callId,
            reason: 'GDPR_Article_17',
            created_at: new Date().toISOString()
          })

        return createSuccessResponse({
          callId,
          deleted: true,
          deletedAt: new Date().toISOString(),
          compliance: 'GDPR_Article_17'
        })

      case 'transcribe':
        // Trigger transcription if not already available
        const { data: existingRecording, error: recordingError } = await supabase
          .from('call_recordings')
          .select('transcription_url, transcription_status')
          .eq('call_id', callId)
          .eq('user_id', userId)
          .single()

        if (recordingError) {
          throw new Error('Recording not found')
        }

        if (existingRecording.transcription_url) {
          return createSuccessResponse({
            message: 'Transcription already available',
            transcriptionUrl: existingRecording.transcription_url
          })
        }

        // Update status to processing
        await supabase
          .from('call_recordings')
          .update({
            transcription_status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        // In a real implementation, this would trigger the transcription service
        // For now, we'll simulate the process
        return createSuccessResponse({
          message: 'Transcription started',
          status: 'processing',
          estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Must be "download", "share", "delete", or "transcribe"'
        }, { status: 400 })
    }

  } catch (error) {
    return handleApiError(error)
  }
}