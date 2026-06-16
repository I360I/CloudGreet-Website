import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { slugify } from '@/lib/blog-generate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET one post (full body) for editing. */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  const { data, error } = await supabaseAdmin.from('blog_posts').select('*').eq('id', params.id).maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, post: data })
}

/**
 * PATCH /api/admin/blog/[id]
 * Body may include: title, description, body, keywords[], slug, status.
 * Setting status='published' stamps published_at and revalidates the pages.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  const body = await request.json().catch(() => ({} as any))
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 200)
  if (typeof body.description === 'string') patch.description = body.description.trim().slice(0, 320)
  if (typeof body.body === 'string') patch.body = body.body
  if (Array.isArray(body.keywords)) patch.keywords = body.keywords.map((k: any) => String(k).trim()).filter(Boolean)
  if (typeof body.slug === 'string' && body.slug.trim()) patch.slug = slugify(body.slug)

  const { data: current } = await supabaseAdmin.from('blog_posts').select('slug, status, published_at').eq('id', params.id).maybeSingle()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.status === 'published' || body.status === 'draft') {
    patch.status = body.status
    if (body.status === 'published' && !current.published_at) patch.published_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin.from('blog_posts').update(patch).eq('id', params.id).select('*').single()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That slug is already taken.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Refresh the public pages immediately on any change to a (now or previously) published post.
  const slug = (data as any).slug || current.slug
  try {
    revalidatePath('/blog')
    revalidatePath(`/blog/${slug}`)
    revalidatePath('/sitemap.xml')
  } catch { /* best-effort */ }

  return NextResponse.json({ success: true, post: data })
}

/** DELETE a post. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  const { data: existing } = await supabaseAdmin.from('blog_posts').select('slug').eq('id', params.id).maybeSingle()
  const { error } = await supabaseAdmin.from('blog_posts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try {
    revalidatePath('/blog')
    if (existing?.slug) revalidatePath(`/blog/${existing.slug}`)
    revalidatePath('/sitemap.xml')
  } catch { /* best-effort */ }
  return NextResponse.json({ success: true })
}
