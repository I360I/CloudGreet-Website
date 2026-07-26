import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'Smart Ride Central Ohio: 5 rides a month to 66 | CloudGreet Customers',
 description:
  'How an owner-operated airport transportation business in Central Ohio grew from 5 completed rides a month to 66 with CloudGreet answering every call and text. Real numbers from a live, auto-updated dashboard.',
}

/**
 * Customer case study - published with the owner's approval. Every
 * number on this page comes from Smart Ride's own public dashboard,
 * which updates automatically from completed reservations. We link to
 * it so prospects can verify the data live.
 */
const MONTHS = [
 { label: 'Feb', rides: 5 },
 { label: 'Mar', rides: 10 },
 { label: 'Apr', rides: 45 },
 { label: 'May', rides: 32 },
 { label: 'Jun', rides: 66 },
 { label: 'Jul', rides: 55 },
]

const STATS = [
 { value: '213', label: 'Completed rides' },
 { value: '432', label: 'Passengers served' },
 { value: '49', label: 'Repeat customers' },
 { value: '45%', label: 'Have booked more than once' },
 { value: '77%', label: 'Airport-related trips' },
 { value: '40', label: 'Pickups before 8:00 AM' },
]

export default function SmartRideCaseStudy() {
 const max = Math.max(...MONTHS.map((m) => m.rides))
 return (
  <div className="min-h-screen bg-[#f6f5f1] text-gray-900">
   <nav className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-50">
    <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
     <Link href="/" className="flex items-center">
      <span className="text-2xl font-medium tracking-tight text-gray-900">CloudGreet</span>
     </Link>
     <Link
      href="/contact"
      className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
     >
      Book a demo
     </Link>
    </div>
   </nav>

   <main className="max-w-3xl mx-auto px-5 py-14">
    <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2">Customer results</p>
    <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-balance">
     Smart Ride Central Ohio: from 5 rides a month to 66
    </h1>
    <p className="text-gray-600 mt-4 max-w-2xl">
     Smart Ride is an owner-operated airport transportation service in Central Ohio. Every ride is
     driven by the owner, which means every call that comes in while he is driving used to be a
     missed call. Since putting CloudGreet on the phones this spring, every call and text gets
     answered, quoted, and booked, including the 40 pickups that started before 8:00 AM.
    </p>

    {/* Monthly growth chart - recreated from Smart Ride's public dashboard */}
    <section className="bg-white border border-gray-200 rounded-2xl p-6 mt-10">
     <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">Growth since launch</p>
     <h2 className="text-lg font-semibold tracking-tight mt-1">Completed rides by month</h2>
     <div className="flex items-end gap-3 sm:gap-5 mt-8 h-48">
      {MONTHS.map((m) => (
       <div key={m.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
        <span className="text-sm font-semibold tabular-nums">{m.rides}</span>
        <div
         className="w-full rounded-t-lg"
         style={{
          height: `${Math.max(4, (m.rides / max) * 100)}%`,
          background: 'linear-gradient(180deg, #1d4ed8 0%, #0f2b66 100%)',
         }}
        />
        <span className="text-xs text-gray-500">{m.label}</span>
       </div>
      ))}
     </div>
     <p className="text-xs text-gray-500 mt-5">
      2026, completed reservations only. May really did dip, this is live business data, not a
      marketing curve. Verify it yourself on{' '}
      <a
       href="https://smartridecentralohio.com/smart-ride-dashboard/"
       target="_blank"
       rel="noopener noreferrer"
       className="text-gray-900 underline underline-offset-2"
      >
       Smart Ride&apos;s public dashboard
      </a>
      , which updates automatically from completed rides.
     </p>
    </section>

    <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
     {STATS.map((s) => (
      <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
       <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
       <div className="text-xs text-gray-500 mt-1">{s.label}</div>
      </div>
     ))}
    </section>

    <section className="bg-white border border-gray-200 rounded-2xl p-6 mt-6">
     <h2 className="text-lg font-semibold tracking-tight">What CloudGreet handles for Smart Ride</h2>
     <ul className="mt-4 space-y-3 text-sm text-gray-600 leading-relaxed">
      <li>
       <span className="text-gray-900 font-medium">Calls answered while the owner drives.</span>{' '}
       Most trips are airport runs, exactly when a solo operator cannot pick up. The AI answers,
       quotes the trip, and books it.
      </li>
      <li>
       <span className="text-gray-900 font-medium">Text-to-book on his website and ads.</span>{' '}
       Customers text the AI assistant line, get a quote with real availability, and confirm the
       reservation over SMS.
      </li>
      <li>
       <span className="text-gray-900 font-medium">Early-morning coverage.</span> 40 of the
       completed pickups started before 8:00 AM. Those calls and texts came in at hours a
       one-person business cannot staff.
      </li>
      <li>
       <span className="text-gray-900 font-medium">Repeat-customer memory.</span> Returning
       callers are recognized, which is part of why 45% of identified customers have booked more
       than once.
      </li>
      <li>
       <span className="text-gray-900 font-medium">Live transfer when it matters.</span> When a
       caller needs the owner, the AI tries his direct line first and only takes a callback if he
       cannot pick up.
      </li>
     </ul>
    </section>

    <section className="bg-gray-900 text-white rounded-2xl p-8 mt-6 text-center">
     <h2 className="text-xl font-medium tracking-tight text-balance">
      Your business has a version of this chart. Let&apos;s find it.
     </h2>
     <p className="text-sm text-gray-300 mt-2 max-w-md mx-auto">
      Every demo is configured for your business, call it yourself and judge the AI on your own
      use case before paying anything.
     </p>
     <Link
      href="/contact"
      className="inline-block bg-white text-gray-900 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors mt-5"
     >
      Book a demo
     </Link>
    </section>

    <div className="mt-10 text-sm text-gray-500">
     Published with the owner&apos;s approval. Numbers as of July 25, 2026, from{' '}
     <a
      href="https://smartridecentralohio.com/smart-ride-dashboard/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-900 underline underline-offset-2"
     >
      Smart Ride&apos;s live dashboard
     </a>
     . Related: <Link href="/trust" className="text-gray-900 underline underline-offset-2">Trust center</Link>
    </div>
   </main>
  </div>
 )
}
