/**
 * Blog post generator - drafts an SEO blog post with Claude and writes it to
 * content/blog/<slug>.md as a DRAFT for you to review.
 *
 *   npx tsx --env-file=.env.local scripts/blog-gen.ts "how much does an answering service cost"
 *   npx tsx --env-file=.env.local scripts/blog-gen.ts            # picks the next idea from the backlog
 *
 * Workflow: generate -> the file lands with draft:true (visible in dev only)
 * -> you read/edit it -> flip `draft: false` -> commit -> it's live + in the
 * sitemap (cloudgreet.com auto-deploys from main).
 *
 * HONESTY: this drafts; a human publishes. Do NOT auto-publish a firehose of
 * thin AI posts - Google rewards genuinely useful content and demotes
 * mass-produced filler. Generate on real topics your buyers search, then
 * read every one before flipping it live.
 */

import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'

const MODEL = process.env.BLOG_GEN_MODEL || 'claude-opus-4-8'
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

// A backlog of high-intent topics for service-business owners. Used when you
// don't pass a topic. Edit freely.
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

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Compelling, specific, <= 65 chars ideally. Not clickbait.' },
    slug: { type: 'string', description: 'kebab-case URL slug, no dates, <= 60 chars.' },
    description: { type: 'string', description: 'Meta description, 140-160 chars, includes the primary keyword naturally.' },
    keywords: { type: 'array', items: { type: 'string' }, description: '4-8 target keywords/phrases.' },
    body_markdown: { type: 'string', description: 'The full post in markdown. Use ## H2 section headers (no H1 - the title renders separately). 800-1300 words. Real, specific, useful advice. Include at least one internal link to /#roi (the ROI calculator) and one to /contact. Where natural, reference Steve French at SmartRide Central Ohio as a real example. No fabricated stats - if you cite a number frame it as an illustration ("say you miss five calls a day"). End with a short CTA paragraph.' },
  },
  required: ['title', 'slug', 'description', 'keywords', 'body_markdown'],
} as const

const SYSTEM = `You write SEO blog posts for CloudGreet, a 24/7 AI receptionist that answers calls and books jobs for local service businesses (HVAC, plumbing, electrical, roofing, transport, law, etc.) while the owner is busy working.

Audience: owner-operators and small service businesses who lose revenue to missed calls. Write founder-to-owner: plain, concrete, no corporate fluff, no keyword stuffing. Genuinely useful even to someone who never buys. Demonstrate real understanding of running a service business (being on a job, after-hours calls, two calls at once).

Rules:
- Target the given keyword/topic naturally - in the title, the first paragraph, and a couple of H2s - without stuffing.
- Structure with ## H2 sections (3-6 of them). Short paragraphs. Use a numbered or bulleted list where it helps.
- No fabricated statistics or fake studies. Illustrative math is fine ("say you miss five calls a day at a 450 dollar average job").
- Include one internal link to /#roi (ROI calculator) and one to /contact (book a demo), placed naturally.
- Where it fits, use the real customer example: Steve French runs SmartRide Central Ohio (executive transport); he is usually driving and can't answer the phone, so CloudGreet answers and books for him.
- No em dashes. Use commas or rewrite.
- Output ONLY via the structured tool. body_markdown must NOT include an H1 or the frontmatter - just the post body in markdown.`

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function todayISO(): string {
  // Date is unavailable in some sandboxes for determinism reasons; in this
  // CLI it's fine. Fall back to a placeholder the author can fix.
  try { return new Date().toISOString().slice(0, 10) } catch { return 'REPLACE-DATE' }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY missing. Run: npx tsx --env-file=.env.local scripts/blog-gen.ts "<topic>"'); process.exit(1) }
  const topic = process.argv.slice(2).join(' ').trim() || pickBacklog()
  console.log(`\n  Drafting a post on: "${topic}"  (model: ${MODEL})\n`)

  const client = new Anthropic({ timeout: 180_000, maxRetries: 1 })
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [{ name: 'emit_post', description: 'Return the finished blog post.', input_schema: SCHEMA as any }],
    tool_choice: { type: 'tool', name: 'emit_post' },
    messages: [{ role: 'user', content: `Write a blog post targeting this topic/keyword: "${topic}"` }],
  })

  const block = resp.content.find((b: any) => b.type === 'tool_use') as any
  if (!block) { console.error('Model did not return a post.'); process.exit(1) }
  const post = block.input as { title: string; slug: string; description: string; keywords: string[]; body_markdown: string }

  const slug = slugify(post.slug || post.title)
  if (!existsSync(BLOG_DIR)) mkdirSync(BLOG_DIR, { recursive: true })
  const file = path.join(BLOG_DIR, `${slug}.md`)
  if (existsSync(file)) { console.error(`A post already exists at ${file} - rename or remove it first.`); process.exit(1) }

  const fm = [
    '---',
    `title: ${JSON.stringify(post.title)}`,
    `description: ${JSON.stringify(post.description)}`,
    `date: ${todayISO()}`,
    `keywords: ${JSON.stringify((post.keywords || []).join(', '))}`,
    'author: The CloudGreet Team',
    'draft: true',
    '---',
    '',
    post.body_markdown.trim(),
    '',
  ].join('\n')

  writeFileSync(file, fm)
  console.log(`  Draft written -> ${file}`)
  console.log(`  Title: ${post.title}`)
  console.log(`  Slug:  /blog/${slug}`)
  console.log(`\n  Next: preview it (npx tsx ... scripts/lead-console.ts is unrelated; run the site with`)
  console.log(`  'npm run dev' and open http://localhost:3000/blog/${slug}), edit as needed,`)
  console.log(`  then flip 'draft: true' -> 'draft: false' and commit to publish.\n`)
}

function pickBacklog(): string {
  // Skip topics whose slug already exists so repeated runs walk the backlog.
  let existing = new Set<string>()
  try { existing = new Set(readdirSync(BLOG_DIR).map((f) => f.replace(/\.md$/, ''))) } catch { /* no dir yet */ }
  const next = BACKLOG.find((t) => !existing.has(slugify(t)))
  return next || BACKLOG[0]
}

main().catch((e) => { console.error(e); process.exit(1) })
