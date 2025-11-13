import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().min(10).optional(),
  tags: z.array(z.string()).optional()
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
    if (payload.title !== undefined) updates.title = payload.title
    if (payload.content !== undefined) updates.content = payload.content
    if (payload.tags !== undefined) updates.tags = payload.tags

    const { data, error } = await supabaseAdmin
      .from('business_knowledge_entries')
      .update(updates)
      .eq('id', params.id)
      .eq('business_id', auth.businessId)
      .select('id, title, content, tags, created_at, updated_at')
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Knowledge entry not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, entry: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 422 })
    }

    logger.error('Failed to update knowledge entry', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to update knowledge entry' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { error } = await supabaseAdmin
      .from('business_knowledge_entries')
      .delete()
      .eq('id', params.id)
      .eq('business_id', auth.businessId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete knowledge entry', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to delete knowledge entry' }, { status: 500 })
  }
}


