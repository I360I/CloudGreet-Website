import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

const SERIF = "Georgia, 'Times New Roman', Times, serif"

/**
 * Classic blog right-hand sidebar (About + Recent Posts), the familiar
 * old-blog layout. Fills the horizontal space next to the article instead
 * of leaving wide empty margins.
 */
export function BlogSidebar({ currentSlug }: { currentSlug?: string }) {
  const recent = getAllPosts().filter((p) => p.slug !== currentSlug).slice(0, 6)
  return (
    <aside className="w-full md:w-[290px] md:shrink-0 mt-12 md:mt-0" style={{ fontFamily: SERIF }}>
      <div className="border border-gray-300 bg-[#fafafa] p-5">
        <h3 className="text-[15px] font-bold uppercase tracking-wide text-[#1a1a1a]">About CloudGreet</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-[#444]">
          CloudGreet is a 24/7 AI receptionist for service businesses. It answers every call and books the job, even when you&apos;re on the job and can&apos;t pick up.
        </p>
        <p className="mt-3">
          <Link href="/contact" className="text-[#1155cc] underline text-[15px]">Book a 15-minute demo &raquo;</Link>
        </p>
      </div>

      {recent.length > 0 && (
        <div className="mt-7">
          <h3 className="text-[15px] font-bold uppercase tracking-wide text-[#1a1a1a] border-b border-gray-300 pb-2">Recent Posts</h3>
          <ul className="mt-3 space-y-3">
            {recent.map((p) => (
              <li key={p.slug} className="text-[15px] leading-snug">
                <Link href={`/blog/${p.slug}`} className="text-[#1155cc] underline">{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 border-t border-gray-300 pt-4 text-[14px] text-gray-500">
        <Link href="/" className="text-[#1155cc] underline">Home</Link> &middot; <Link href="/blog" className="text-[#1155cc] underline">All posts</Link>
      </div>
    </aside>
  )
}
