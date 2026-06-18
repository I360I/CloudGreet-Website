/**
 * Blog post generation via Claude. Shared by the admin API
 * (app/api/admin/blog) and the CLI (scripts/blog-gen.ts).
 *
 * Returns a structured draft; the caller persists it (as a DRAFT) and a
 * human reviews + publishes. We never auto-publish - genuinely useful posts
 * on real buyer topics, reviewed before going live.
 */

import Anthropic from '@anthropic-ai/sdk'

export const BLOG_MODEL = process.env.BLOG_GEN_MODEL || 'claude-opus-4-8'

export type GeneratedPost = {
  title: string
  slug: string
  description: string
  keywords: string[]
  body: string // markdown (no frontmatter, no H1)
}

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Compelling, specific, <= 65 chars ideally. Not clickbait.' },
    slug: { type: 'string', description: 'kebab-case URL slug, no dates, <= 60 chars.' },
    description: { type: 'string', description: 'Meta description, 140-160 chars, includes the primary keyword naturally.' },
    keywords: { type: 'array', items: { type: 'string' }, description: '4-8 target keywords/phrases.' },
    body_markdown: { type: 'string', description: 'Full post in markdown. Use ## H2 section headers (NO H1, NO frontmatter). 800-1300 words. Real, specific, useful advice. Include one internal link to /#roi and one to /contact. Where natural, reference Steve French at SmartRide Central Ohio. No fabricated stats - frame numbers as illustrations. End with a short CTA paragraph. No em dashes.' },
  },
  required: ['title', 'slug', 'description', 'keywords', 'body_markdown'],
} as const

const SYSTEM = `You write SEO blog posts for CloudGreet, a 24/7 AI receptionist that answers calls and books jobs for local service businesses (HVAC, plumbing, electrical, roofing, transport, law, etc.) while the owner is busy working.

Audience: owner-operators and small service businesses who lose revenue to missed calls. Write founder-to-owner: plain, concrete, no corporate fluff, no keyword stuffing. Genuinely useful even to someone who never buys. Show real understanding of running a service business (being on a job, after-hours calls, two calls at once).

Rules:
- Target the given keyword/topic naturally in the title, first paragraph, and a couple of H2s, without stuffing.
- Structure with 3-6 ## H2 sections. Short paragraphs. Lists where they help.
- No fabricated statistics. Illustrative math is fine ("say you miss five calls a day at a 450 dollar average job").
- One internal link to /#roi (ROI calculator) and one to /contact (book a demo), placed naturally.
- Where it fits, use the real example: Steve French runs SmartRide Central Ohio (executive transport); he is usually driving and can't answer, so CloudGreet answers and books for him.
- No em dashes. Use commas or rewrite.
- Output ONLY via the structured tool. body_markdown must NOT include an H1 or frontmatter.`

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

/** Normalize keywords to a clean string[] - the model sometimes returns a
 *  comma-joined STRING despite the array schema, which broke the text[] insert
 *  ("malformed array literal"). */
function normalizeKeywords(k: unknown): string[] {
  if (Array.isArray(k)) return k.map((x) => String(x).trim()).filter(Boolean).slice(0, 12)
  if (typeof k === 'string') return k.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12)
  return []
}

/**
 * Draft an SEO post. `topic` is optional:
 *   - empty  -> Claude PICKS a strong, fresh topic for CloudGreet's audience
 *               (avoiding the existing titles you pass in).
 *   - given  -> Claude treats it as a seed and SHARPENS it into a better SEO
 *               angle + title (improves rough phrasing), then writes the post.
 */
export async function generatePost(
  topic: string,
  opts: { existingTitles?: string[] } = {},
): Promise<GeneratedPost> {
  const client = new Anthropic({ timeout: 180_000, maxRetries: 1 })
  const avoid = (opts.existingTitles || []).filter(Boolean).slice(0, 50)
  const avoidBlock = avoid.length
    ? `\n\nWe've ALREADY published or drafted these - pick a genuinely different angle, do not duplicate:\n- ${avoid.join('\n- ')}`
    : ''
  const instruction = topic.trim()
    ? `The user gave this rough topic/idea: "${topic.trim()}". Treat it as a seed: sharpen it into a strong, specific, search-friendly angle and title (improve on their phrasing - don't just echo it), then write the post.${avoidBlock}`
    : `No topic was given. Choose a high-value, buyer-intent SEO topic for CloudGreet's audience that we have NOT covered yet, then write the post.${avoidBlock}`

  const resp = await client.messages.create({
    model: BLOG_MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [{ name: 'emit_post', description: 'Return the finished blog post.', input_schema: SCHEMA as any }],
    tool_choice: { type: 'tool', name: 'emit_post' },
    messages: [{ role: 'user', content: instruction }],
  })
  const block = resp.content.find((b: any) => b.type === 'tool_use') as any
  if (!block) throw new Error('Model did not return a post')
  const p = block.input as { title: string; slug: string; description: string; keywords: unknown; body_markdown: string }
  return {
    title: p.title,
    slug: slugify(p.slug || p.title),
    description: p.description,
    keywords: normalizeKeywords(p.keywords),
    body: (p.body_markdown || '').trim(),
  }
}
