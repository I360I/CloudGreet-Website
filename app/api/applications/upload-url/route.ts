import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_RESUME_BYTES = 15 * 1024 * 1024
const MAX_VIDEO_BYTES = 200 * 1024 * 1024

const RESUME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const VIDEO_TYPES = new Set([
  'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm',
])

/**
 * POST /api/applications/upload-url
 *   { kind: 'resume' | 'video', filename: string, content_type: string, size: number }
 *
 * Returns a one-shot signed upload URL the candidate's browser can PUT
 * the file to directly. Keeps the Vercel function body small (PDF/MP4
 * never hit our serverless limit) and skips needing storage credentials
 * on the client.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any))
    const { kind, filename, content_type, size } = body || {}

    if (kind !== 'resume' && kind !== 'video') {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
    }
    if (typeof filename !== 'string' || !filename) {
      return NextResponse.json({ error: 'filename required' }, { status: 400 })
    }
    if (typeof content_type !== 'string') {
      return NextResponse.json({ error: 'content_type required' }, { status: 400 })
    }
    if (typeof size !== 'number' || size <= 0) {
      return NextResponse.json({ error: 'size required' }, { status: 400 })
    }

    const allowed = kind === 'resume' ? RESUME_TYPES : VIDEO_TYPES
    if (!allowed.has(content_type)) {
      return NextResponse.json({
        error: kind === 'resume'
          ? 'Resume must be a PDF or Word doc'
          : 'Video must be MP4, MOV, or WebM',
      }, { status: 400 })
    }

    const max = kind === 'resume' ? MAX_RESUME_BYTES : MAX_VIDEO_BYTES
    if (size > max) {
      return NextResponse.json({
        error: `File too large. Max ${Math.round(max / 1024 / 1024)} MB.`,
      }, { status: 400 })
    }

    const safeExt = (filename.match(/\.[A-Za-z0-9]{1,8}$/)?.[0] || '').toLowerCase()
    const path = `${kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${safeExt}`

    const tryCreate = async () =>
      supabaseAdmin.storage.from('applications').createSignedUploadUrl(path)

    let { data, error } = await tryCreate()

    // Self-heal: if the bucket isn't there, create it (private) and retry
    // once. Avoids needing the SQL migration to land before the form
    // works.
    if (error && /bucket not found|not found/i.test(error.message || '')) {
      const { error: createErr } = await supabaseAdmin
        .storage.createBucket('applications', {
          public: false,
          fileSizeLimit: 200 * 1024 * 1024,
        })
      if (createErr && !/already exists|duplicate/i.test(createErr.message)) {
        logger.error('createBucket failed', { error: createErr.message })
        return NextResponse.json({
          error: `Storage bucket setup failed: ${createErr.message}`,
        }, { status: 500 })
      }
      ;({ data, error } = await tryCreate())
    }

    if (error || !data) {
      logger.error('createSignedUploadUrl failed', {
        kind, error: error?.message,
      })
      return NextResponse.json({
        error: error?.message || 'Could not create upload URL',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      path,
      token: data.token,
      signed_url: data.signedUrl,
    })
  } catch (e) {
    logger.error('upload-url failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
