import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { checkCronAuth } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron: GET /api/cron/blog-publish
 * Runs daily at 9 AM UTC. Publishes any blog_posts where
 * status='draft' and scheduled_for <= now().
 */
export async function GET(request: NextRequest) {
  const denial = await checkCronAuth(request)
  if (denial) return denial

  const now = new Date().toISOString()

  const { data: due, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title')
    .eq('status', 'draft')
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', now)

  if (error) {
    logger.error('blog-publish cron: query failed', { error: error.message })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ ok: true, published: 0 })
  }

  const ids = due.map((p: any) => p.id)

  const { error: updateErr } = await supabaseAdmin
    .from('blog_posts')
    .update({ status: 'published', published_at: now, scheduled_for: null, updated_at: now })
    .in('id', ids)

  if (updateErr) {
    logger.error('blog-publish cron: update failed', { error: updateErr.message })
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 })
  }

  // Revalidate all affected pages
  try {
    revalidatePath('/blog')
    revalidatePath('/sitemap.xml')
    for (const p of due as any[]) {
      if (p.slug) revalidatePath(`/blog/${p.slug}`)
    }
  } catch { /* best-effort */ }

  const slugs = (due as any[]).map((p: any) => String(p.slug))
  logger.info('blog-publish cron: published scheduled posts', { count: due.length })

  return NextResponse.json({ ok: true, published: due.length, posts: slugs })
}
