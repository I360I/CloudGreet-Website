import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { marked } from 'marked'
import { getAllPosts, getPost } from '@/lib/blog'
import { BlogSidebar } from '../_sidebar'

const SERIF = "Georgia, 'Times New Roman', Times, serif"

export const revalidate = 300
export const dynamicParams = true // new posts published from admin render on-demand then cache

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug)
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

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
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
    <main className="min-h-screen bg-white text-[#222]" style={{ fontFamily: SERIF }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-gray-300">
        <div className="max-w-[1080px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" aria-label="CloudGreet">
            <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={150} height={45} priority className="h-8 w-auto" />
          </Link>
          <Link href="/contact" className="text-[15px] text-[#1155cc] underline">Book a demo</Link>
        </div>
      </header>

      <div className="max-w-[1080px] mx-auto px-6 py-10 flex flex-col md:flex-row md:gap-12">
        <article className="flex-1 min-w-0">
          <p><Link href="/blog" className="text-[#1155cc] underline text-[15px]">&laquo; Back to the blog</Link></p>

          <h1 className="mt-5 text-[34px] md:text-[40px] font-bold leading-[1.15] text-[#1a1a1a]" style={{ fontFamily: SERIF }}>
            {post.title}
          </h1>
          <p className="mt-3 text-[14px] text-gray-500">
            Posted on {fmtDate(post.date)} by {post.author}
          </p>
          <hr className="my-7 border-gray-300" />

          <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />

          <hr className="my-9 border-gray-300" />
          <div className="text-[17px] leading-[1.7]">
            <p className="font-bold text-[#1a1a1a]">Stop losing jobs to voicemail.</p>
            <p className="mt-1 text-[#333]">CloudGreet answers every call and books the job, even when you can&apos;t pick up. <Link href="/contact" className="text-[#1155cc] underline">Book a 15-minute demo</Link> or <Link href="/#roi" className="text-[#1155cc] underline">see what missed calls cost you</Link>.</p>
          </div>
        </article>
        <BlogSidebar currentSlug={post.slug} />
      </div>

      <footer className="border-t border-gray-300 mt-8">
        <div className="max-w-[1080px] mx-auto px-6 py-6 text-[14px] text-gray-500">
          &copy; {new Date().getFullYear()} CloudGreet &middot; <Link href="/" className="text-[#1155cc] underline">Home</Link> &middot; <Link href="/blog" className="text-[#1155cc] underline">Blog</Link>
        </div>
      </footer>
    </main>
  )
}
