import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/monitoring'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { count = 5 } = body

    if (!process.env.TELNYX_API_KEY) {
      return NextResponse.json({ error: 'Telnyx not configured' }, { status: 503 })
    }

    if (count < 1 || count > 20) {
      return NextResponse.json({ error: 'Count must be between 1 and 20' }, { status: 400 })
    }

    logger.info('Purchasing toll-free numbers', { count })

    const purchasedNumbers: string[] = []
    const errors: string[] = []

    // Search for available toll-free numbers
    const searchResponse = await fetch(
      `https://api.telnyx.com/v2/available_phone_numbers?filter[features][]=sms&filter[features][]=voice&filter[phone_number][toll_free]=true&filter[limit]=${count * 2}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      logger.error('Failed to search for toll-free numbers', { 
        status: searchResponse.status,
        error: errorText
      })
      return NextResponse.json({ 
        error: 'Failed to search for available numbers' 
      }, { status: 500 })
    }

    const searchData = await searchResponse.json()
    const availableNumbers = searchData.data || []

    if (availableNumbers.length === 0) {
      return NextResponse.json({ 
        error: 'No toll-free numbers available' 
      }, { status: 404 })
    }

    // Purchase the requested number of toll-free numbers
    for (let i = 0; i < Math.min(count, availableNumbers.length); i++) {
      const phoneNumber = availableNumbers[i].phone_number

      try {
        // Purchase the number from Telnyx
        const purchaseResponse = await fetch('https://api.telnyx.com/v2/number_orders', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone_numbers: [{ phone_number: phoneNumber }],
            connection_id: process.env.TELNYX_CONNECTION_ID,
            messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID
          })
        })

        if (!purchaseResponse.ok) {
          const errorText = await purchaseResponse.text()
          logger.error('Failed to purchase number', { 
            phoneNumber,
            status: purchaseResponse.status,
            error: errorText
          })
          errors.push(`${phoneNumber}: ${errorText}`)
          continue
        }

        // Add to database
        const { error: dbError } = await supabaseAdmin
          .from('toll_free_numbers')
          .insert({
            number: phoneNumber,
            status: 'available',
            verification_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (dbError) {
          logger.error('Failed to save number to database', { 
            phoneNumber,
            error: dbError
          })
          errors.push(`${phoneNumber}: Database error`)
          continue
        }

        purchasedNumbers.push(phoneNumber)
        logger.info('Successfully purchased toll-free number', { phoneNumber })

      } catch (error) {
        logger.error('Error purchasing number', { 
          phoneNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        errors.push(`${phoneNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      purchased: purchasedNumbers.length,
      numbers: purchasedNumbers,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully purchased ${purchasedNumbers.length} toll-free numbers. Please verify them in the Telnyx portal.`
    })

  } catch (error) {
    logger.error('Error in buy phone numbers API', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

