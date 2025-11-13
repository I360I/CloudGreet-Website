import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { upsertProspectingFilters, getProspectingFilters } from '@/lib/prospecting/filters'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'

const PROVIDER = 'apollo'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin(request)
    const filters = await getProspectingFilters(PROVIDER)
    const { data: log } = await supabaseAdmin
      .from('prospect_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ provider: PROVIDER, filters, lastSync: log })
  } catch (error) {
    logger.error('Failed to fetch prospecting filters', { error })
    return NextResponse.json(
      { error: (error as Error).message },
      { status: (error as { status?: number }).status ?? 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    await upsertProspectingFilters(PROVIDER, body.filters)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to save prospecting filters', { error })
    return NextResponse.json(
      { error: (error as Error).message },
      { status: (error as { status?: number }).status ?? 500 }
    )
  }
}


