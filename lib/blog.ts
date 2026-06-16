/**
 * Blog content layer. Posts live in the Supabase `blog_posts` table so they
 * can be generated, edited, and published from the admin dashboard (no git /
 * no terminal). Public pages read PUBLISHED posts here; the admin API
 * (app/api/admin/blog) manages all statuses.
 */

import { supabaseAdmin } from './supabase'

export type BlogPost = {
  slug: string
  title: string
  description: string
  date: string // YYYY-MM-DD (published date, falls back to created)
  keywords: string[]
  author: string
  draft: boolean
  body: string // markdown
}

export type BlogRow = {
  id: string
  slug: string
  title: string
  description: string | null
  body: string | null
  keywords: string[] | null
  author: string | null
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
  published_at: string | null
}

export function mapRow(r: BlogRow): BlogPost {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description || '',
    date: (r.published_at || r.created_at || '').slice(0, 10) || '1970-01-01',
    keywords: r.keywords || [],
    author: r.author || 'The CloudGreet Team',
    draft: r.status !== 'published',
    body: r.body || '',
  }
}

/** Published posts only, newest first. Used by the public blog + sitemap. */
export async function getAllPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as BlogRow[]).map(mapRow)
}

/** A single PUBLISHED post by slug (public). Returns null for drafts/missing. */
export async function getPost(slug: string): Promise<BlogPost | null> {
  const { data } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return data ? mapRow(data as BlogRow) : null
}
