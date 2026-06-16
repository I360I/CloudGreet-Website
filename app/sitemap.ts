import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'

export default function sitemap(): MetadataRoute.Sitemap {
 const baseUrl = 'https://cloudgreet.com'
 const lastModified = new Date()

 // Only public, indexable routes belong here. Auth-gated areas
 // (/dashboard, /settings, /admin, /sales) are blocked in robots.ts and
 // intentionally left out.
 const pages: MetadataRoute.Sitemap = [
  { url: baseUrl, lastModified, changeFrequency: 'weekly', priority: 1 },
  { url: `${baseUrl}/contact`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${baseUrl}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
  { url: `${baseUrl}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/apply`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/tcpa-a2p`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/cookies`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
 ]

 // Published blog posts (drafts filtered out by getAllPosts in production).
 const posts: MetadataRoute.Sitemap = getAllPosts()
  .filter((p) => !p.draft)
  .map((p) => ({
   url: `${baseUrl}/blog/${p.slug}`,
   lastModified: new Date(p.date + 'T00:00:00'),
   changeFrequency: 'monthly',
   priority: 0.6,
  }))

 return [...pages, ...posts]
}
