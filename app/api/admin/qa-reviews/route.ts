import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  callId: z.string().optional(),
  callUrl: z.string().url().optional(),
  rating: z.number().min(1).max(5),
  highlights: z.string().optional(),
  actionItems: z.string().optional()
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('call_quality_reviews')
      .select('id, call_id, call_url, rating, highlights, action_items, status, created_at, updated_at')
      .eq('business_id', auth.businessId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, reviews: data ?? [] })
  } catch (error) {
    logger.error('Failed to fetch QA reviews', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to load QA reviews' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = createSchema.parse(await request.json())
    const { data, error } = await supabaseAdmin
      .from('call_quality_reviews')
      .insert({
        business_id: auth.businessId,
        reviewer_id: auth.userId,
        call_id: payload.callId ?? null,
        call_url: payload.callUrl ?? null,
        rating: payload.rating,
        highlights: payload.highlights ?? null,
        action_items: payload.actionItems ?? null
      })
      .select('id, call_id, call_url, rating, highlights, action_items, status, created_at, updated_at')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, review: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 422 })
    }

    logger.error('Failed to create QA review', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to create QA review' }, { status: 500 })
  }
}


