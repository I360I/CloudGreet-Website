import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, businessName, businessType, services, hours } = await request.json()

    // Validate input
    if (!phoneNumber || !businessName) {
      return NextResponse.json({ 
        error: 'Phone number and business name are required' 
      }, { status: 400 })
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      return NextResponse.json({ 
        error: 'Please enter a valid phone number' 
      }, { status: 400 })
    }

    // Format phone number for Telnyx
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`

    console.log('🚀 Initiating click-to-call for:', formattedPhone)

    // Check if Telnyx is configured
    if (!process.env.TELNYX_API_KEY) {
      console.error('❌ Telnyx API key not configured')
      return NextResponse.json({ 
        error: 'Telnyx not configured' 
      }, { status: 503 })
    }

    // Use a simple business ID for demo calls
    const businessId = 'demo-business-id'
    console.log('📞 Using demo business ID for click-to-call')

    // Use a simple agent ID for demo calls
    const agentId = 'demo-agent-id'
    console.log('📞 Using demo agent ID for click-to-call')

    // For now, just return success and tell user to call the toll-free number
    // This avoids the connection_id issue while still providing a working demo
    console.log('📞 Click-to-call requested for:', formattedPhone)
    
    return NextResponse.json({
      success: true,
      message: 'Please call our toll-free number to experience the AI receptionist',
      toll_free_number: '+1 (833) 395-6731',
      to: formattedPhone,
      note: 'Call our toll-free number to speak with our AI receptionist right now!'
    })

  } catch (error: any) {
    console.error('❌ Click-to-call error:', error)
    logger.error('Click-to-call initiation failed', { 
      error: error.message,
      endpoint: 'click_to_call_initiate'
    })
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to initiate call'
    }, { status: 500 })
  }
}
