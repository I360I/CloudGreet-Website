import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin Phone Number Purchase
 * 
 * Purchases toll-free numbers from Telnyx API and adds them to inventory.
 * 
 * POST Body: { count?: number, areaCode?: string }
 * - count: Number of numbers to purchase (default: 1)
 * - areaCode: Area code preference (optional, for toll-free numbers this is ignored)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Check Telnyx API key
    const telnyxApiKey = process.env.TELNYX_API_KEY || process.env.TELYNX_API_KEY
    if (!telnyxApiKey) {
      logger.error('Telnyx API key not configured')
      return NextResponse.json(
        { error: 'Telnyx API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const count = body.count || 1
    const areaCode = body.areaCode // Optional, not used for toll-free

    if (count < 1 || count > 10) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 10' },
        { status: 400 }
      )
    }

    const purchasedNumbers: Array<{ number: string; telnyxId?: string }> = []
    const errors: Array<{ number?: string; error: string }> = []

    // Purchase each number
    for (let i = 0; i < count; i++) {
      try {
        // Search for available toll-free numbers (800, 888, 877, 866)
        const searchResponse = await fetch('https://api.telnyx.com/v2/available_phone_numbers', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${telnyxApiKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text()
          errors.push({
            error: `Telnyx search failed: ${searchResponse.status} ${errorText}`
          })
          continue
        }

        const searchData = await searchResponse.json()
        
        // Filter for toll-free numbers (800, 888, 877, 866)
        const tollFreeNumbers = searchData.data?.filter((num: { phone_number?: string }) => {
          const phone = num.phone_number || ''
          return phone.startsWith('+1800') || phone.startsWith('+1888') || 
                 phone.startsWith('+1877') || phone.startsWith('+1866')
        }) || []

        if (tollFreeNumbers.length === 0) {
          errors.push({
            error: 'No toll-free numbers available from Telnyx'
          })
          continue
        }

        // Purchase the first available toll-free number
        const numberToPurchase = tollFreeNumbers[0]
        const purchaseResponse = await fetch('https://api.telnyx.com/v2/phone_numbers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${telnyxApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone_number: numberToPurchase.phone_number
          })
        })

        if (!purchaseResponse.ok) {
          const errorText = await purchaseResponse.text()
          errors.push({
            number: numberToPurchase.phone_number,
            error: `Telnyx purchase failed: ${purchaseResponse.status} ${errorText}`
          })
          continue
        }

        const purchaseData = await purchaseResponse.json()
        const phoneNumber = purchaseData.data?.phone_number || numberToPurchase.phone_number
        const telnyxId = purchaseData.data?.id

        // Add to database inventory
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('toll_free_numbers')
          .insert({
            number: phoneNumber.replace('+1', ''), // Store without country code
            status: 'available',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          // If duplicate, that's okay - number already in inventory
          if (insertError.code === '23505') {
            logger.warn('Phone number already in inventory', { phoneNumber })
            purchasedNumbers.push({ number: phoneNumber.replace('+1', ''), telnyxId })
          } else {
            errors.push({
              number: phoneNumber,
              error: `Database insert failed: ${insertError.message}`
            })
          }
        } else {
          purchasedNumbers.push({
            number: inserted.number,
            telnyxId
          })
        }

        logger.info('Phone number purchased and added to inventory', {
          phoneNumber: inserted?.number || phoneNumber,
          telnyxId,
          adminId: adminAuth.userId
        })

      } catch (purchaseError) {
        errors.push({
          error: purchaseError instanceof Error ? purchaseError.message : 'Unknown error'
        })
        logger.error('Phone number purchase failed', {
          error: purchaseError instanceof Error ? purchaseError.message : 'Unknown error',
          attempt: i + 1
        })
      }
    }

    return NextResponse.json({
      success: purchasedNumbers.length > 0,
      purchased: purchasedNumbers.length,
      requested: count,
      numbers: purchasedNumbers,
      errors: errors.length > 0 ? errors : undefined,
      message: purchasedNumbers.length > 0
        ? `Successfully purchased ${purchasedNumbers.length} phone number(s)`
        : 'Failed to purchase phone numbers'
    })

  } catch (error) {
    logger.error('Admin phone number purchase failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      {
        error: 'Failed to purchase phone numbers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

