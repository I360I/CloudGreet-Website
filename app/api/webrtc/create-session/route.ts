import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { businessName, businessType, services, hours } = await request.json()

    

    // Get your real business
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!business) {
      return NextResponse.json({ 
        error: 'No business found' 
      }, { status: 404 })
    }

    // Create WebRTC session
    const sessionId = `webrtc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    
    // Store session in database
    const { error: sessionError } = await supabaseAdmin
      .from('webrtc_sessions')
      .insert({
        session_id: sessionId,
        business_id: business.id,
        status: 'active',
        created_at: new Date().toISOString()
      })

    if (sessionError) {
      console.error('❌ Error storing WebRTC session:', sessionError)
    }

    // Create Telnyx WebRTC session
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/texml/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId,
        client_state: JSON.stringify({
          business_id: business.id,
          session_type: 'webrtc_demo'
        }),
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/webrtc/webhook`,
        webhook_failover_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/webrtc/webhook`
      })
    })

    if (!telnyxResponse.ok) {
      const errorData = await telnyxResponse.text()
      console.error('❌ Telnyx WebRTC error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to create Telnyx WebRTC session' 
      }, { status: 500 })
    }

    const telnyxData = await telnyxResponse.json()
    

    return NextResponse.json({
      success: true,
      sessionId,
      sdp: telnyxData.sdp,
      iceServers: telnyxData.ice_servers
    })

  } catch (error: any) {
    console.error('❌ WebRTC session creation error:', error)
    logger.error('WebRTC session creation failed', { 
      error: error.message,
      endpoint: 'webrtc_create_session'
    })
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to create WebRTC session'
    }, { status: 500 })
  }
}
