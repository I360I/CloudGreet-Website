import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
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
    const jwtSecret = process.env.JWT_SECRET
    
    // Decode JWT token
    const decoded = jwt.verify(token, jwtSecret) as any
    const userId = decoded.userId
    const userBusinessId = decoded.businessId

    if (!userId || !userBusinessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    const targetBusinessId = businessId || userBusinessId

    // Check if business has an active subscription
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('subscription_status, billing_plan, business_name')
      .eq('id', targetBusinessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ 
        success: false,
        error: 'Business not found' 
      }, { status: 404 })
    }

    // Require active subscription before provisioning phone
    if (business.subscription_status !== 'active' && business.subscription_status !== 'trialing') {
      return NextResponse.json({ 
        success: false,
        error: 'Active subscription required',
        message: 'Please subscribe to a plan before getting a phone number',
        requiresPayment: true
      }, { status: 402 })
    }

    // Check if Telnyx is configured
    if (!process.env.TELYNX_API_KEY) {
      logger.error('Phone provisioning attempted without Telnyx configuration', {
        businessId: targetBusinessId
      })
      
      return NextResponse.json({ 
        success: false,
        error: 'Phone service not configured',
        message: 'Phone provisioning is temporarily unavailable. Please contact support.',
        requiresConfiguration: true
      }, { status: 503 })
    }

    // STEP 1: Check if we already have unassigned numbers in our database
    const { data: existingNumbers, error: existingError } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('*')
      .eq('status', 'available')
      .is('business_id', null)
      .ilike('number', `+1${areaCode}%`)
      .limit(1)

    // If we have an available number, use it
    if (existingNumbers && existingNumbers.length > 0) {
      const existingNumber = existingNumbers[0]
      
      // Assign it to this business
      const { data: assignedNumber, error: assignError } = await supabaseAdmin
        .from('toll_free_numbers')
        .update({
          business_id: targetBusinessId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingNumber.id)
        .select()
        .single()

      if (assignError) {
        return NextResponse.json({ error: 'Failed to assign existing number' }, { status: 500 })
      }

      // Update business with phone number
      await supabaseAdmin
        .from('businesses')
        .update({
          phone_number: existingNumber.number,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetBusinessId)

      return NextResponse.json({
        success: true,
        message: 'Existing phone number assigned successfully',
        phoneNumber: existingNumber.number,
        phoneRecordId: existingNumber.id,
        provider: 'telnyx',
        source: 'existing_pool'
      })
    }

    // STEP 2: No available numbers in our pool, search for LOCAL numbers from Telnyx
    // Local numbers work IMMEDIATELY - no verification wait
    // SMS is compliant for transactional messages (appointments, confirmations, customer replies)
    const telnyxResponse = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?filter[features][]=sms&filter[features][]=voice&filter[national_destination_code]=${areaCode}&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    let selectedNumber = null
    let phoneNumber = null

    if (!telnyxResponse.ok) {
      // Try nearby area codes if requested area code not available
      const nearbyAreaCodes = [
        areaCode, 
        String(parseInt(areaCode) + 1).padStart(3, '0'),
        String(parseInt(areaCode) - 1).padStart(3, '0')
      ]
      
      for (const code of nearbyAreaCodes) {
        const altResponse = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?filter[features][]=sms&filter[features][]=voice&filter[national_destination_code]=${code}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (altResponse.ok) {
          const altData = await altResponse.json()
          if (altData.data && altData.data.length > 0) {
            selectedNumber = altData.data[0]
            phoneNumber = selectedNumber.phone_number
            break
          }
        }
      }
      
      if (!selectedNumber) {
        return NextResponse.json({ 
          error: 'No phone numbers available in this area. Please try a different area code.' 
        }, { status: 400 })
      }
    } else {
      const telnyxData = await telnyxResponse.json()
      
      if (!telnyxData.data || telnyxData.data.length === 0) {
        return NextResponse.json({ 
          error: 'No phone numbers available. Please try a different area code.' 
        }, { status: 400 })
      }

      selectedNumber = telnyxData.data[0]
      phoneNumber = selectedNumber.phone_number
    }

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
        monthly_cost: parseInt(process.env.PHONE_MONTHLY_COST || '200'),
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
      const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://cloudgreet.com'}/api/telnyx/configure-webhook`, {
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
        // Webhook configured successfully
      } else {
        // Webhook configuration failed - will retry later
      }
    } catch (error) {
      // Webhook configuration error - will retry later
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
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to provision phone number',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
