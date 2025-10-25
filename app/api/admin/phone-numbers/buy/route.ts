import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const adminPayload = verifyAdminToken(token)
    
    if (!adminPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { count } = body

    if (!count || count < 1 || count > 10) {
      return NextResponse.json({ error: 'Count must be between 1 and 10' }, { status: 400 })
    }

    // Purchase real toll-free numbers from Telnyx
    const purchasedNumbers = []
    
    try {
      // Call Telnyx API to search for available toll-free numbers
      const searchResponse = await fetch('https://api.telnyx.com/v2/available_phone_numbers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!searchResponse.ok) {
        throw new Error('Telnyx search failed')
      }
      
      const searchData = await searchResponse.json()
      const availableNumbers = searchData.data.filter((num: any) => 
        num.phone_number.startsWith('+1800') || 
        num.phone_number.startsWith('+1888') || 
        num.phone_number.startsWith('+1877') || 
        num.phone_number.startsWith('+1866')
      ).slice(0, count)
      
      // Purchase each number
      for (const numberData of availableNumbers) {
        const purchaseResponse = await fetch('https://api.telnyx.com/v2/phone_numbers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone_number: numberData.phone_number,
            connection_id: process.env.TELNYX_CONNECTION_ID,
            webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook`,
            webhook_failover_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook`
          })
        })
        
        if (purchaseResponse.ok) {
          const purchaseData = await purchaseResponse.json()
          purchasedNumbers.push({
            id: purchaseData.data.id,
            number: purchaseData.data.phone_number,
            status: 'available',
            verification_status: 'pending',
            telnyx_phone_id: purchaseData.data.id,
            created_at: new Date().toISOString()
          })
          
          // Store in database
          await supabaseAdmin
            .from('toll_free_numbers')
            .insert({
              telnyx_phone_id: purchaseData.data.id,
              number: purchaseData.data.phone_number,
              status: 'available',
              verification_status: 'pending',
              assigned_to: null,
              business_name: null,
              assigned_at: null,
              created_at: new Date().toISOString()
            })
        }
      }
      
    } catch (error) {
      logger.error('Telnyx purchase failed:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to purchase phone numbers from Telnyx',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      purchased: count,
      numbers: purchasedNumbers,
      message: `Successfully purchased ${count} phone numbers. Please verify them in Telnyx portal.`
    })
  } catch (error) {
    logger.error('Buy phone numbers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
