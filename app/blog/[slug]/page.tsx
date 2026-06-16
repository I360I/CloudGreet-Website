import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { marked } from 'marked'
import { getAllPosts, getPost } from '@/lib/blog'

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug)
  if (!post) return { title: 'Not found — CloudGreet' }
  const url = `https://cloudgreet.com/blog/${post.slug}`
  return {
    title: `${post.title} — CloudGreet`,
    description: post.description,
    keywords: post.keywords.length ? post.keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  }
}

function fmtDate(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) notFound()

  const html = marked.parse(post.body, { async: false }) as string
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'CloudGreet',
      logo: { '@type': 'ImageObject', url: 'https://cloudgreet.com/cloudgreet-logo.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://cloudgreet.com/blog/${post.slug}` },
    keywords: post.keywords.join(', '),
  }

  return (
    <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="sticky top-0 z-50 bg-[#f6f5f1]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" aria-label="CloudGreet">
            <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={160} height={48} priority className="h-9 w-auto" />
          </Link>
          <Link href="/contact" className="text-sm bg-gray-900 text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-colors">
            Book a demo
          </Link>
        </div>
      </nav>

      <article className="px-6 pt-14 md:pt-20 pb-24 max-w-3xl mx-auto">
        <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← All posts</Link>
        <div className="mt-6 text-xs font-mono uppercase tracking-wider text-gray-400">
          {fmtDate(post.date)} · {post.author}
        </div>
        <h1 className="mt-3 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.08]">{post.title}</h1>
        <p className="mt-5 text-lg text-gray-500 leading-relaxed">{post.description}</p>

        <div
          className="cg-prose mt-10 text-[17px] leading-[1.75] text-gray-800"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="mt-14 rounded-3xl border border-gray-200 bg-white p-7 md:p-9 text-center">
          <h2 className="font-display text-2xl font-medium tracking-tight">Stop losing jobs to voicemail.</h2>
          <p className="mt-2 text-gray-500">CloudGreet answers every call and books the job, even when you can't pick up.</p>
          <Link href="/contact" className="mt-5 inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors">
            Book a 15-minute demo →
          </Link>
        </div>
      </article>
    </main>
  )
}
