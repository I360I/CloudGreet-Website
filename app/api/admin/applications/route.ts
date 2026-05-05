import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUSES = [
  'new', 'reviewing', 'interview_scheduled', 'offered', 'hired', 'rejected', 'withdrawn',
] as const

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('rep_applications')
      .select(`
        id, first_name, last_name, email, phone, city, state,
        years_sales_experience, biggest_deal_cents, monthly_goal_deals,
        resume_url, video_url, status, created_at
      `)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      logger.error('Admin applications list failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 })
    }

    const counts: Record<string, number> = {}
    for (const s of STATUSES) counts[s] = 0
    for (const a of data || []) counts[a.status] = (counts[a.status] || 0) + 1

    return NextResponse.json({ success: true, applications: data || [], counts })
  } catch (e) {
    logger.error('Admin applications GET failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 })
  }
}
