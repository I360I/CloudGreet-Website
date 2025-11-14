import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const upsertSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  tags: z.array(z.string()).optional()
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const businessId = searchParams.get('businessId') // Optional: filter by business for admin

    let query = supabaseAdmin
      .from('business_knowledge_entries')
      .select('id, title, content, tags, created_at, updated_at')
      .order('updated_at', { ascending: false })

    // If businessId provided, filter by it; otherwise admin sees all entries
    if (businessId) {
      query = query.eq('business_id', businessId)
    } else if (auth.businessId) {
      // Non-admin users must filter by their business
      query = query.eq('business_id', auth.businessId)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data, error } = await query
    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, entries: data ?? [] })
  } catch (error) {
    logger.error('Failed to load knowledge entries', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to load knowledge base' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.businessId || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = upsertSchema.parse(await request.json())
    const { data, error } = await supabaseAdmin
      .from('business_knowledge_entries')
      .insert({
        business_id: auth.businessId,
        title: payload.title,
        content: payload.content,
        tags: payload.tags ?? [],
        created_by: auth.userId
      })
      .select('id, title, content, tags, created_at, updated_at')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, entry: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 422 })
    }

    logger.error('Failed to create knowledge entry', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to create knowledge entry' }, { status: 500 })
  }
}


