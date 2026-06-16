import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import { BlogSidebar } from './_sidebar'

export const metadata: Metadata = {
  title: 'Blog — CloudGreet | AI Receptionist for Service Businesses',
  description:
    'Practical advice for service-business owners on never missing a call, booking more jobs, and growing without hiring a front desk. From the team behind CloudGreet.',
  alternates: { canonical: 'https://cloudgreet.com/blog' },
  openGraph: {
    title: 'CloudGreet Blog',
    description: 'Practical advice for service-business owners on never missing a call and booking more jobs.',
    url: 'https://cloudgreet.com/blog',
    type: 'website',
  },
}

const SERIF = "Georgia, 'Times New Roman', Times, serif"

function fmtDate(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogIndex() {
  const posts = getAllPosts()
  return (
    <main className="min-h-screen bg-white text-[#222]" style={{ fontFamily: SERIF }}>
      {/* Simple, traditional header */}
      <header className="border-b border-gray-300">
        <div className="max-w-[1080px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" aria-label="CloudGreet">
            <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={150} height={45} priority className="h-8 w-auto" />
          </Link>
          <Link href="/contact" className="text-[15px] text-[#1155cc] underline">Book a demo</Link>
        </div>
      </header>

      <div className="max-w-[1080px] mx-auto px-6 py-10 flex flex-col md:flex-row md:gap-12">
        <div className="flex-1 min-w-0">
          <h1 className="text-[34px] font-bold leading-tight text-[#1a1a1a]" style={{ fontFamily: SERIF }}>
            The CloudGreet Blog
          </h1>
          <p className="mt-2 text-[17px] italic text-gray-600">
            Practical, plain-spoken advice for service-business owners: capturing every call, booking more jobs, and growing without hiring a front desk.
          </p>
          <hr className="my-8 border-gray-300" />

          {posts.length === 0 ? (
            <p className="text-gray-600">New posts are on the way.</p>
          ) : (
            posts.map((p, i) => (
              <article key={p.slug} className={i > 0 ? 'mt-10 pt-10 border-t border-gray-200' : ''}>
                <h2 className="text-[26px] font-bold leading-snug" style={{ fontFamily: SERIF }}>
                  <Link href={`/blog/${p.slug}`} className="text-[#1155cc] hover:underline">{p.title}</Link>
                </h2>
                <p className="mt-1 text-[14px] text-gray-500">
                  Posted on {fmtDate(p.date)} by {p.author}{p.draft ? ' · DRAFT' : ''}
                </p>
                <p className="mt-3 text-[17px] leading-[1.7] text-[#333]">{p.description}</p>
                <p className="mt-3">
                  <Link href={`/blog/${p.slug}`} className="text-[#1155cc] underline text-[16px]">Read more &raquo;</Link>
                </p>
              </article>
            ))
          )}
        </div>
        <BlogSidebar />
      </div>

      <footer className="border-t border-gray-300 mt-8">
        <div className="max-w-[1080px] mx-auto px-6 py-6 text-[14px] text-gray-500">
          &copy; {new Date().getFullYear()} CloudGreet &middot; <Link href="/" className="text-[#1155cc] underline">Home</Link> &middot; <Link href="/contact" className="text-[#1155cc] underline">Book a demo</Link>
        </div>
      </footer>
    </main>
  )
}
