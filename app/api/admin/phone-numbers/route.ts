import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/monitoring'
import { requireAdmin } from '@/lib/admin-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // CRITICAL: Require admin authentication
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }
    
    // Fetch all toll-free numbers with business info
    const { data: numbers, error } = await supabaseAdmin
      .from('toll_free_numbers')
      .select(`
        *,
        businesses (
          business_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch phone numbers', { error })
      return NextResponse.json({ error: 'Failed to fetch phone numbers' }, { status: 500 })
    }

    // Format the response
    const formattedNumbers = numbers.map(num => ({
      id: num.id,
      number: num.number,
      status: num.status,
      verification_status: num.verification_status,
      verification_submitted_at: num.verification_submitted_at,
      verification_completed_at: num.verification_completed_at,
      verification_failure_reason: num.verification_failure_reason,
      business_id: num.business_id,
      business_name: num.businesses?.business_name,
      created_at: num.created_at,
      updated_at: num.updated_at
    }))

    return NextResponse.json({ 
      numbers: formattedNumbers,
      total: formattedNumbers.length
    })

  } catch (error) {
    logger.error('Error in phone numbers API', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

