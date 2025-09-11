import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    validateUserId(userId)

    // Initialize Retell API
    const retellApiKey = process.env.RETELL_API_KEY
    if (!retellApiKey || retellApiKey.includes('your-') || retellApiKey.includes('demo-')) {
      return NextResponse.json({
        success: false,
        error: 'Retell AI API key not configured. Please set RETELL_API_KEY in environment variables.'
      }, { status: 503 })
    }

    // Fetch real call logs from Retell API
    const queryParams = new URLSearchParams()
    if (startDate) queryParams.append('start_date', startDate)
    if (endDate) queryParams.append('end_date', endDate)
    if (limit) queryParams.append('limit', limit.toString())
    if (offset) queryParams.append('offset', offset.toString())

    const retellResponse = await fetch(`https://api.retellai.com/v2/get-calls?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      }
    })

    if (!retellResponse.ok) {
      throw new Error(`Retell API error: ${retellResponse.status} ${retellResponse.statusText}`)
    }

    const retellData = await retellResponse.json()
    
    // Filter calls by user's agent IDs
    const { data: userAgents, error: agentsError } = await supabase
      .from('voice_agents')
      .select('agent_id')
      .eq('user_id', userId)

    if (agentsError) {
      throw new Error('Failed to fetch user agents')
    }

    const userAgentIds = userAgents?.map(agent => agent.agent_id) || []
    const filteredCalls = retellData.calls?.filter((call: any) => 
      userAgentIds.includes(call.agent_id)
    ) || []

    // Store call logs in database for future reference
    if (filteredCalls.length > 0) {
      const callLogs = filteredCalls.map((call: any) => ({
        call_id: call.call_id,
        user_id: userId,
        agent_id: call.agent_id,
        customer_phone: call.customer_phone,
        start_time: call.start_time,
        end_time: call.end_time,
        duration: call.duration,
        status: call.status,
        recording_url: call.recording_url,
        transcription_url: call.transcription_url,
        cost: call.cost,
        created_at: new Date().toISOString()
      }))

      // Upsert call logs (ignore conflicts)
      await supabase
        .from('calls')
        .upsert(callLogs, { onConflict: 'call_id' })
    }

    return createSuccessResponse({
      calls: filteredCalls,
      total: retellData.total || filteredCalls.length,
      hasMore: retellData.has_more || false,
      pagination: {
        limit,
        offset,
        total: retellData.total || filteredCalls.length
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, callId, action, data } = body

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
      case 'update_notes':
        const { error: updateError } = await supabase
          .from('calls')
          .update({
            notes: data.notes,
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        if (updateError) {
          throw new Error('Failed to update call notes')
        }

        return createSuccessResponse({
          message: 'Call notes updated successfully'
        })

      case 'add_tag':
        const { error: tagError } = await supabase
          .from('calls')
          .update({
            tags: [...(call.tags || []), data.tag],
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        if (tagError) {
          throw new Error('Failed to add tag')
        }

        return createSuccessResponse({
          message: 'Tag added successfully'
        })

      case 'remove_tag':
        const { error: removeTagError } = await supabase
          .from('calls')
          .update({
            tags: (call.tags || []).filter((tag: string) => tag !== data.tag),
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        if (removeTagError) {
          throw new Error('Failed to remove tag')
        }

        return createSuccessResponse({
          message: 'Tag removed successfully'
        })

      case 'mark_follow_up':
        const { error: followUpError } = await supabase
          .from('calls')
          .update({
            follow_up_required: true,
            follow_up_notes: data.notes,
            follow_up_date: data.follow_up_date,
            updated_at: new Date().toISOString()
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        if (followUpError) {
          throw new Error('Failed to mark follow up')
        }

        return createSuccessResponse({
          message: 'Follow up marked successfully'
        })

      case 'export':
        // Generate export data
        const exportData = {
          callId: call.call_id,
          customerPhone: call.customer_phone,
          startTime: call.start_time,
          endTime: call.end_time,
          duration: call.duration,
          status: call.status,
          notes: call.notes,
          tags: call.tags,
          recordingUrl: call.recording_url,
          transcriptionUrl: call.transcription_url,
          cost: call.cost,
          exportedAt: new Date().toISOString()
        }

        return createSuccessResponse({
          exportData,
          message: 'Call data exported successfully'
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