import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

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

function fmtDate(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogIndex() {
  const posts = getAllPosts()
  return (
    <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
      <nav className="sticky top-0 z-50 bg-[#f6f5f1]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" aria-label="CloudGreet">
            <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={160} height={48} priority className="h-9 w-auto" />
          </Link>
          <Link href="/contact" className="text-sm bg-gray-900 text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-colors">
            Book a demo
          </Link>
        </div>
      </nav>

      <section className="px-6 pt-16 md:pt-24 pb-10 max-w-3xl mx-auto">
        <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-gray-400 mb-3">The CloudGreet Blog</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05]">
          Never miss the call that pays the bills.
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-xl">
          Practical, no-fluff advice for service-business owners: capturing every call, booking more jobs, and growing without hiring a front desk.
        </p>
      </section>

      <section className="px-6 pb-28 max-w-3xl mx-auto">
        {posts.length === 0 ? (
          <p className="text-gray-500">New posts are on the way.</p>
        ) : (
          <ul className="divide-y divide-black/5 border-t border-black/5">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group block py-7">
                  <div className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                    {fmtDate(p.date)}{p.draft ? ' · DRAFT' : ''}
                  </div>
                  <h2 className="font-display text-2xl font-medium tracking-tight group-hover:text-sky-700 transition-colors">
                    {p.title}
                  </h2>
                  <p className="mt-2 text-gray-600 leading-relaxed">{p.description}</p>
                  <span className="mt-3 inline-block text-sm font-medium text-sky-700">Read more →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
