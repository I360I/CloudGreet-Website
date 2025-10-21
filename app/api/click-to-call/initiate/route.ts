import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export async function POST(request: NextRequest) {
  try {
    // Set a timeout for the entire function
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Call initiation timed out after 10 seconds'));
      }, 10000); // 10 second timeout
    });

    const operationPromise = (async () => {
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

      logger.info('Initiating click-to-call for:', { formattedPhone })

      // Check if Telnyx is configured
      if (!process.env.TELYNX_API_KEY) {
        logger.error('Telnyx API key not configured')
        return NextResponse.json({ 
          error: 'Telnyx not configured' 
        }, { status: 503 })
      }

      // Use demo business ID
      const businessId = '00000000-0000-0000-0000-000000000001'
      const fromNumber = '+18333956731'
      const connectionId = process.env.TELYNX_CONNECTION_ID || '2786688063168841616'

      logger.info('Making Telnyx call...', { connectionId, fromNumber, formattedPhone })

      // Create the call payload
      const callPayload = {
        to: formattedPhone,
        from: fromNumber,
        connection_id: connectionId,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/voice-webhook`,
        webhook_url_method: 'POST'
      }

      // Single optimized Telnyx API call
      const telnyxResponse = await fetch('https://api.telnyx.com/v2/calls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(callPayload)
      })

      if (!telnyxResponse.ok) {
        const errorData = await telnyxResponse.text()
        logger.error('Telnyx API error:', {
          status: telnyxResponse.status,
          statusText: telnyxResponse.statusText,
          error: errorData,
          payload: callPayload
        })
        
        let errorMessage = `Telnyx API error: ${telnyxResponse.status} - ${errorData}`
        try {
          const errorJson = JSON.parse(errorData)
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = `Telnyx Error: ${errorJson.errors[0].title} - ${errorJson.errors[0].detail}`
          }
        } catch (e) {
          // Keep original error message if JSON parsing fails
        }
        
        return NextResponse.json({
          error: errorMessage
        }, { status: 500 })
      }

      const callData = await telnyxResponse.json()
      logger.info('Telnyx call created:', { callData })

      // Store the call in database (simplified)
      const { error: callError } = await supabaseAdmin
        .from('calls')
        .insert({
          business_id: businessId,
          call_id: callData.data.call_control_id,
          customer_phone: formattedPhone,
          call_status: 'initiated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (callError) {
        logger.error('Error storing call:', { callError })
        // Don't fail the request, just log the error
      }

      logger.info('Click-to-call initiated successfully', {
        to: formattedPhone,
        from: fromNumber,
        business_id: businessId,
        call_control_id: callData.data.call_control_id
      })

      return NextResponse.json({
        success: true,
        message: 'Call initiated successfully! Check your phone.',
        call_id: callData.data.call_control_id,
        to: formattedPhone,
        from: fromNumber
      })
    })();

    return await Promise.race([operationPromise, timeoutPromise]);

  } catch (error: unknown) {
    logger.error('Click-to-call error:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      endpoint: 'click_to_call_initiate'
    })
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate call'
    }, { status: 500 })
  }
}
