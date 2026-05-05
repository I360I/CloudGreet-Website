import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUSES = [
  'new', 'reviewing', 'interview_scheduled', 'offered', 'hired', 'rejected', 'withdrawn',
] as const

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('rep_applications')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Mint short-lived signed URLs for the uploaded files so the admin
  // page can render them without exposing the bucket publicly.
  let resume_signed_url: string | null = null
  let video_signed_url: string | null = null
  const expiresIn = 60 * 60 // 1 hour
  if (data.resume_path) {
    const { data: s } = await supabaseAdmin.storage
      .from('applications')
      .createSignedUrl(data.resume_path, expiresIn)
    resume_signed_url = s?.signedUrl || null
  }
  if (data.video_path) {
    const { data: s } = await supabaseAdmin.storage
      .from('applications')
      .createSignedUrl(data.video_path, expiresIn)
    video_signed_url = s?.signedUrl || null
  }

  return NextResponse.json({
    success: true,
    application: { ...data, resume_signed_url, video_signed_url },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))
  const update: Record<string, any> = {}

  if (typeof body.status === 'string') {
    if (!STATUSES.includes(body.status as any)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
    update.reviewed_by = auth.userId
    update.reviewed_at = new Date().toISOString()
  }
  if (typeof body.admin_notes === 'string') {
    update.admin_notes = body.admin_notes.slice(0, 5000)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('rep_applications')
    .update(update)
    .eq('id', params.id)
    .select('*')
    .maybeSingle()

  if (error) {
    logger.error('Admin application PATCH failed', { id: params.id, error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, application: data })
}
