import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
 const baseUrl = 'https://cloudgreet.com'
 const lastModified = new Date()

 // Only public, indexable routes belong here. Auth-gated areas
 // (/dashboard, /settings, /admin, /sales) are blocked in robots.ts and
 // intentionally left out.
 return [
  { url: baseUrl, lastModified, changeFrequency: 'weekly', priority: 1 },
  { url: `${baseUrl}/contact`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${baseUrl}/apply`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/tcpa-a2p`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/cookies`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
 ]
}
