import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET  /api/onboarding/videos          → returns the current progress blob
 * PATCH /api/onboarding/videos         → upsert one step's progress
 *   body: { key: string, watched?: boolean, completed?: boolean }
 *
 * Step list itself lives in lib/onboarding/video-steps.ts and is rendered
 * client-side - this endpoint only stores the per-step booleans.
 */

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('onboarding_video_progress')
      .eq('id', auth.businessId)
      .single()
    if (error) {
      // Column may not exist on older deployments - return empty so
      // the UI still works.
      return NextResponse.json({ success: true, progress: {} })
    }
    return NextResponse.json({
      success: true,
      progress: (data as any)?.onboarding_video_progress || {},
    })
  } catch (e) {
    logger.error('video progress GET failed', {
      businessId: auth.businessId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    key?: string; watched?: boolean; completed?: boolean
  }
  const key = (body.key || '').trim()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  try {
    const { data: row } = await supabaseAdmin
      .from('businesses')
      .select('onboarding_video_progress')
      .eq('id', auth.businessId)
      .single()
    const progress: Record<string, any> = (row as any)?.onboarding_video_progress || {}
    const prev = progress[key] || {}
    progress[key] = {
      ...prev,
      ...(typeof body.watched === 'boolean' ? { watched: body.watched } : {}),
      ...(typeof body.completed === 'boolean' ? { completed: body.completed } : {}),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabaseAdmin
      .from('businesses')
      .update({ onboarding_video_progress: progress, updated_at: new Date().toISOString() })
      .eq('id', auth.businessId)
    if (error) {
      // If the column isn't there yet, surface a clear error so admin
      // knows to run the migration.
      return NextResponse.json({
        error: 'Could not save - run sql/onboarding-video-progress.sql',
      }, { status: 500 })
    }
    return NextResponse.json({ success: true, progress })
  } catch (e) {
    logger.error('video progress PATCH failed', {
      businessId: auth.businessId,
      key,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
