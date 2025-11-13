import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const updateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']).optional(),
  highlights: z.string().optional(),
  actionItems: z.string().optional()
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = updateSchema.parse(await request.json())
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (payload.status !== undefined) updates.status = payload.status
    if (payload.highlights !== undefined) updates.highlights = payload.highlights
    if (payload.actionItems !== undefined) updates.action_items = payload.actionItems

    const { data, error } = await supabaseAdmin
      .from('call_quality_reviews')
      .update(updates)
      .eq('id', params.id)
      .eq('business_id', auth.businessId)
      .select('id, call_id, call_url, rating, highlights, action_items, status, created_at, updated_at')
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, review: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 422 })
    }

    logger.error('Failed to update QA review', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to update QA review' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { error } = await supabaseAdmin
      .from('call_quality_reviews')
      .delete()
      .eq('id', params.id)
      .eq('business_id', auth.businessId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete QA review', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to delete QA review' }, { status: 500 })
  }
}


