import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { generatePost, slugify } from '@/lib/blog-generate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/** GET /api/admin/blog - all posts (drafts + published), newest first. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title, description, status, author, created_at, updated_at, published_at')
    .order('updated_at', { ascending: false })
  if (error) {
    if (/blog_posts|does not exist/.test(error.message)) {
      return NextResponse.json({ error: 'blog_posts table missing - apply the migration.', migration_required: true }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, posts: data ?? [] })
}

/**
 * POST /api/admin/blog
 *   { topic: string }                          -> generate a draft with Claude
 *   { title, body, description?, keywords? }   -> save a manual draft
 * Always created as a DRAFT for review.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  let row: { slug: string; title: string; description: string; body: string; keywords: string[] }

  // Manual save only when a title is given WITHOUT a topic field. Otherwise
  // (the admin "Generate draft" button always sends `topic`, possibly empty)
  // we generate - an empty topic means "Claude picks a fresh topic for me".
  const isManualSave = typeof body.title === 'string' && body.title.trim() && !('topic' in body)

  if (!isManualSave) {
    try {
      const topic = typeof body.topic === 'string' ? body.topic : ''
      // Hand the generator our existing titles so it doesn't duplicate.
      const { data: existing } = await supabaseAdmin.from('blog_posts').select('title')
      const existingTitles = (existing || []).map((r: any) => r.title).filter(Boolean)
      const post = await generatePost(topic, { existingTitles })
      row = { slug: post.slug, title: post.title, description: post.description, body: post.body, keywords: post.keywords }
    } catch (e) {
      logger.error('blog generate failed', { error: e instanceof Error ? e.message : 'unknown' })
      return NextResponse.json({ error: 'Generation failed: ' + (e instanceof Error ? e.message : 'unknown') }, { status: 502 })
    }
  } else {
    row = {
      slug: slugify(String(body.slug || body.title)),
      title: String(body.title).trim(),
      description: String(body.description || '').trim(),
      body: String(body.body || '').trim(),
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
    }
  }

  // Ensure unique slug.
  let slug = row.slug || 'post'
  for (let i = 2; ; i++) {
    const { data: clash } = await supabaseAdmin.from('blog_posts').select('id').eq('slug', slug).maybeSingle()
    if (!clash) break
    slug = `${row.slug}-${i}`
  }

  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .insert({ ...row, slug, status: 'draft' })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, post: data })
}
