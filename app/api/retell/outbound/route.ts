import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { verifyJWT } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyJWT(request)
    if (!authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { to, businessId } = await request.json()
    if (!to || !businessId) {
      return NextResponse.json({ success: false, error: 'to and businessId required' }, { status: 400 })
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for outbound call', { businessId, error: businessError?.message || JSON.stringify(businessError) })
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
    }

    if (business.owner_id !== authResult.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have access to this business' },
        { status: 403 }
      )
    }

    const apiKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'RETELL_API_KEY missing' }, { status: 500 })
    }

    // Initiate Retell outbound call via Retell API
    const resp = await fetch('https://api.retellai.com/outbound-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, business_id: businessId })
    })

    if (!resp.ok) {
      const txt = await resp.text().catch(() => 'unknown')
      logger.error('Retell outbound call failed', { status: resp.status, txt })
      return NextResponse.json({ success: false, error: 'retell_outbound_failed' }, { status: 502 })
    }

    const data = await resp.json().catch(() => ({}))
    return NextResponse.json({ success: true, data }, { status: 202 })
  } catch (error) {
    logger.error('Outbound call error', { error: (error as Error).message })
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 })
  }
}



