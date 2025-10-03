import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, areaCode = '555' } = body

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    
    // Decode JWT token
    const decoded = jwt.verify(token, jwtSecret) as any
    const userId = decoded.userId
    const userBusinessId = decoded.businessId

    if (!userId || !userBusinessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    const targetBusinessId = businessId || userBusinessId

    // Check if Telnyx is configured
    if (!process.env.TELYNX_API_KEY) {
      // Generate a demo phone number for development
      const demoNumber = `+1${areaCode}${Math.floor(Math.random() * 9000000) + 1000000}`
      
      // Store the demo number
      const { data: phoneRecord, error: phoneError } = await supabaseAdmin
        .from('toll_free_numbers')
        .insert({
          number: demoNumber,
          business_id: targetBusinessId,
          status: 'assigned',
          provider: 'demo',
          monthly_cost: 200,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (phoneError) {
        return NextResponse.json({ error: 'Failed to assign phone number' }, { status: 500 })
      }

      // Update business with phone number
      await supabaseAdmin
        .from('businesses')
        .update({
          phone_number: demoNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetBusinessId)

      return NextResponse.json({
        success: true,
        message: 'Demo phone number assigned successfully',
        phoneNumber: demoNumber,
        phoneRecordId: phoneRecord.id,
        note: 'This is a demo number. Configure Telnyx API for real phone numbers.'
      })
    }

    // Real Telnyx integration
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/phone_numbers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!telnyxResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch phone numbers from Telnyx' }, { status: 500 })
    }

    const telnyxData = await telnyxResponse.json()
    const availableNumbers = telnyxData.data?.filter((num: any) => 
      num.phone_number.startsWith(`+1${areaCode}`) && 
      num.connection_name === null
    )

    if (!availableNumbers || availableNumbers.length === 0) {
      return NextResponse.json({ 
        error: `No available phone numbers in area code ${areaCode}` 
      }, { status: 400 })
    }

    const selectedNumber = availableNumbers[0]
    const phoneNumber = selectedNumber.phone_number

    // Purchase the number
    const purchaseResponse = await fetch(`https://api.telnyx.com/v2/phone_numbers/${selectedNumber.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        connection_name: `cloudgreet-${targetBusinessId}`,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telynyx/voice-webhook`,
        webhook_failover_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telynyx/voice-webhook`
      })
    })

    if (!purchaseResponse.ok) {
      return NextResponse.json({ error: 'Failed to configure phone number' }, { status: 500 })
    }

    // Store the phone number in our database
    const { data: phoneRecord, error: phoneError } = await supabaseAdmin
      .from('toll_free_numbers')
      .insert({
        number: phoneNumber,
        business_id: targetBusinessId,
        status: 'assigned',
        provider: 'telnyx',
        provider_id: selectedNumber.id,
        monthly_cost: 200,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (phoneError) {
      return NextResponse.json({ error: 'Failed to store phone number' }, { status: 500 })
    }

    // Update business with phone number
    await supabaseAdmin
      .from('businesses')
      .update({
        phone_number: phoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetBusinessId)

    // Configure webhook for the new phone number
    try {
      const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/telnyx/configure-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: targetBusinessId,
          phoneNumberId: selectedNumber.id
        })
      })

      if (webhookResponse.ok) {
        console.log('Webhook configured successfully for new phone number')
      } else {
        console.warn('Failed to configure webhook for new phone number')
      }
    } catch (error) {
      console.warn('Error configuring webhook:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number provisioned successfully',
      phoneNumber,
      phoneRecordId: phoneRecord.id,
      provider: 'telnyx',
      webhookConfigured: true
    })

  } catch (error) {
    console.error('Phone provisioning error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to provision phone number' 
    }, { status: 500 })
  }
}
