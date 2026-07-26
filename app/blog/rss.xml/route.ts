import { getAllPosts } from '@/lib/blog'

export const revalidate = 3600

/**
 * RSS 2.0 feed for the blog. Feeds are the strongest "this site
 * publishes content" signal for crawlers and AI answer engines - the
 * blog was invisible to them without one.
 */
export async function GET() {
  const posts = await getAllPosts()
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const items = posts
    .slice(0, 50)
    .map((p) => {
      const url = `https://cloudgreet.com/blog/${p.slug}`
      const date = new Date(p.date + 'T12:00:00Z').toUTCString()
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <description>${esc(p.description || '')}</description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The CloudGreet Blog</title>
    <link>https://cloudgreet.com/blog</link>
    <atom:link href="https://cloudgreet.com/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Practical advice for service-business owners on never missing a call, booking more jobs, and growing without hiring a front desk.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
