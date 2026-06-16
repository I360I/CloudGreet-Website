/**
 * Blog post generator (CLI) - drafts an SEO post with Claude and saves it to
 * the blog_posts table as a DRAFT. Same store the admin Blog page uses, so
 * drafts show up at /admin/blog for review + publish.
 *
 *   npx tsx --env-file=.env.local scripts/blog-gen.ts "how much does an answering service cost"
 *   npx tsx --env-file=.env.local scripts/blog-gen.ts          # next idea from the backlog
 *
 * Prefer the admin UI (/admin/blog) for day-to-day; this CLI is for batch/scripted use.
 */

import { supabaseAdmin } from '../lib/supabase'
import { generatePost, slugify, BLOG_MODEL } from '../lib/blog-generate'

const BACKLOG = [
  'how much does an answering service cost for a small business',
  'how to stop missing customer calls as a solo contractor',
  'AI receptionist vs hiring a front desk: which is cheaper',
  'best way to handle after-hours calls for HVAC businesses',
  'how plumbers can book more jobs without hiring staff',
  'why your business needs 24/7 call answering',
  'missed call text back: what it is and why it works',
  'how to never miss a booking while you are on a job',
]

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'post'
  for (let i = 2; ; i++) {
    const { data } = await supabaseAdmin.from('blog_posts').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    slug = `${base}-${i}`
  }
}

async function pickBacklog(): Promise<string> {
  const { data } = await supabaseAdmin.from('blog_posts').select('slug')
  const existing = new Set((data || []).map((r: any) => r.slug))
  return BACKLOG.find((t) => !existing.has(slugify(t))) || BACKLOG[0]
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY missing.'); process.exit(1) }
  const topic = process.argv.slice(2).join(' ').trim() || (await pickBacklog())
  console.log(`\n  Drafting: "${topic}"  (model: ${BLOG_MODEL})\n`)

  const post = await generatePost(topic)
  const slug = await uniqueSlug(post.slug)
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .insert({ slug, title: post.title, description: post.description, body: post.body, keywords: post.keywords, status: 'draft' })
    .select('id, slug, title')
    .single()
  if (error) { console.error('Insert failed:', error.message); process.exit(1) }

  console.log(`  Draft saved (id ${data.id})`)
  console.log(`  Title: ${data.title}`)
  console.log(`  Review + publish at: /admin/blog  (or preview /blog/${data.slug} after publishing)\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
