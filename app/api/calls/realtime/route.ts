import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || 'default'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Get real call data from database
    const realtimeData = await generateRealtimeCallsData(businessId, limit)
    
    return NextResponse.json({
      success: true,
      data: realtimeData
    })
    
  } catch (error) {
    logger.error('Realtime calls endpoint error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error' 
    })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch real-time calls'
    }, { status: 500 })
  }
}

async function generateRealtimeCallsData(businessId: string, limit: number) {
  // Get real call data from database
  try {
    // Get real calls from database
    const { data: calls, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      logger.error('Error fetching realtime calls', { error: error.message })
      return {
        calls: [],
        activeCalls: [],
        totalCalls: 0,
        activeCallCount: 0
      }
    }
    
    // Process real call data
    const processedCalls = calls?.map(call => ({
      id: call.id,
      fromNumber: call.customer_phone || call.from_number,
      toNumber: call.business_phone || call.to_number,
      status: call.call_status || call.status,
      duration: call.duration || 0,
      startTime: new Date(call.created_at),
      endTime: call.ended_at ? new Date(call.ended_at) : undefined,
      callerName: call.caller_name || 'Unknown',
      callerLocation: call.caller_location || 'Unknown',
      callerInfo: {
        name: call.caller_name || 'Unknown',
        location: call.caller_location || 'Unknown',
        previousCalls: call.previous_calls || 0,
        lastCallDate: call.previous_call_date ? new Date(call.previous_call_date) : undefined
      },
      transcript: call.transcript || undefined,
      summary: call.summary || undefined,
      sentiment: call.sentiment || undefined,
      intent: call.intent || undefined,
      nextAction: call.next_action || undefined,
      recordingUrl: call.recording_url || undefined,
      quality: {
        audioQuality: call.audio_quality || 'good',
        latency: call.latency || 75,
        packetLoss: call.packet_loss || 0.1
      }
    })) || []
    
    // Get active calls (status = 'ringing' or 'answered')
    const activeCalls = processedCalls.filter(call => 
      call.status === 'ringing' || call.status === 'answered'
    )
    
    return {
      calls: processedCalls,
      activeCalls,
      totalCalls: processedCalls.length,
      activeCallCount: activeCalls.length
    }
    
  } catch (error) {
    logger.error('Error fetching realtime calls data', { error })
    return {
      calls: [],
      activeCalls: [],
      totalCalls: 0,
      activeCallCount: 0
    }
  }
}
