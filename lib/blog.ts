/**
 * Blog content layer. Posts are version-controlled markdown files in
 * content/blog/*.md with simple frontmatter, so "push to main" publishes
 * (cloudgreet.com auto-deploys) and every post renders statically for SEO.
 *
 * Frontmatter (between --- fences):
 *   title:       string (required)
 *   description: string (required - used as meta description + listing blurb)
 *   date:        YYYY-MM-DD (required)
 *   keywords:    comma-separated or [a, b] (optional)
 *   author:      string (optional, defaults to "The CloudGreet Team")
 *   draft:       true|false (optional - drafts are hidden in production)
 *
 * Drafts are visible in dev (NODE_ENV !== 'production') so you can preview
 * before flipping draft:false and committing.
 */

import fs from 'node:fs'
import path from 'node:path'

export type BlogPost = {
  slug: string
  title: string
  description: string
  date: string
  keywords: string[]
  author: string
  draft: boolean
  body: string // raw markdown
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

/** Tiny frontmatter parser for our controlled, machine-written files. */
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: raw }
  const data: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    data[key] = val
  }
  return { data, body: m[2].trim() }
}

function toPost(slug: string, raw: string): BlogPost {
  const { data, body } = parseFrontmatter(raw)
  const keywords = (data.keywords || '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((k) => k.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    date: data.date || '1970-01-01',
    keywords,
    author: data.author || 'The CloudGreet Team',
    draft: String(data.draft || '').toLowerCase() === 'true',
    body,
  }
}

const includeDrafts = process.env.NODE_ENV !== 'production'

export function getAllPosts(): BlogPost[] {
  let files: string[] = []
  try {
    files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'))
  } catch {
    return [] // no content dir yet
  }
  const posts = files.map((f) => toPost(f.replace(/\.md$/, ''), fs.readFileSync(path.join(BLOG_DIR, f), 'utf8')))
  return posts
    .filter((p) => includeDrafts || !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): BlogPost | null {
  try {
    const post = toPost(slug, fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), 'utf8'))
    if (post.draft && !includeDrafts) return null
    return post
  } catch {
    return null
  }
}
