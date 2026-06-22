import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'CloudGreet — What We Do',
  description: 'Every feature CloudGreet provides for service businesses.',
  robots: { index: false, follow: false },
}

const features = [
  {
    id: 'phone',
    name: 'AI Phone Receptionist',
    hook: 'Answers every call 24/7. Quotes, books, and transfers live — your business never goes to voicemail.',
    details: [
      'Custom-trained voice agent built specifically for your business — your prices, your service area, your tone.',
      'Handles quotes instantly: asks for pickup/dropoff, computes an exact price, and reads it back.',
      'Books appointments directly into your calendar and checks availability in real time.',
      'Recognizes returning callers and greets them by name.',
      'Transfers to you live when the caller asks or the situation needs a human.',
      'Falls back to a callback request if transfer fails — no call ever just ends.',
      'Works on your existing phone number. No new number, no app for customers to download.',
      'Runs 24/7 including nights, weekends, and holidays.',
    ],
  },
  {
    id: 'sms',
    name: 'AI SMS / Text-to-Book',
    hook: 'Customers text your number, get an instant quote, and confirm a booking — all without calling.',
    details: [
      'Customers text a single number to get an all-inclusive price quote in seconds.',
      'Quote includes every add-on: airport fees, time-of-day surcharges, county tax — no surprises.',
      'Collects name, passenger count, and confirms the full trip details before dispatching.',
      'Sends you a dispatch text the moment a customer confirms, so you can accept or adjust.',
      'Handles follow-up questions, reschedules, and cancellations over text.',
      'Returning customers are recognized; their details are on file.',
      'Owner reset command ("NEW") wipes the session for back-to-back testing or demo runs.',
      'Idempotent — duplicate dispatch attempts are blocked automatically.',
    ],
  },
  {
    id: 'webchat',
    name: 'Web Chat Widget',
    hook: 'Paste one line of code and your AI receptionist lives on your website — quotes, answers, books.',
    details: [
      'A single script tag embeds a chat widget on any website (WordPress, Squarespace, custom HTML — anything).',
      'Reuses the same AI brain as the SMS agent: same pricing, same knowledge, same tone.',
      'Visitors can get a quote, ask service questions, and request a booking without picking up the phone.',
      'Works on mobile and desktop.',
      'Conversations appear in your CloudGreet admin dashboard alongside phone and SMS.',
      'No third-party chat platform — fully owned, no monthly seat fees.',
    ],
  },
  {
    id: 'blog',
    name: 'Automated SEO Blog',
    hook: 'Claude writes and publishes a new blog post every weekday. Your site ranks on Google while you work.',
    details: [
      'One post per weekday, automatically written by AI and tailored to your business and market.',
      'Posts target real search queries your customers type — "how much does an airport ride cost," "best HVAC service near me," etc.',
      'Scheduled publishing: posts go live at 9 AM automatically, no login required.',
      'Admin calendar view shows every post, its status (published / scheduled / draft), and lets you edit anything.',
      'Auto-Schedule button fills the next N weekdays with unique, non-duplicate posts in one click.',
      'No CMS to manage. No writer to hire. No content calendar to maintain.',
      'Posts include metadata, keywords, and structured data for search engines.',
    ],
  },
  {
    id: 'reviews',
    name: 'Review Automation',
    hook: 'Sends a Google review request after every job — automatically, at the right moment.',
    details: [
      'Triggers a review request text to the customer a set time after the job is marked complete.',
      'Message is personalized with the customer name and links directly to your Google review page.',
      'One-tap for the customer — no searching, no friction.',
      'Timing is configurable: send 1 hour after, 24 hours after, or on a custom schedule.',
      'Stops automatically if the customer has already left a review.',
      'Review volume compounds over time — most businesses 3x their review count within 90 days.',
    ],
  },
  {
    id: 'calendar',
    name: 'Live Calendar & Booking',
    hook: 'Real-time availability built into the AI — it only books slots that are actually open.',
    details: [
      'Syncs with Cal.com so the AI checks live availability before offering a time to a customer.',
      'Customers only hear "that time works" when it actually does — no manual double-booking checks.',
      'Conflict calendars block off times when you\'re unavailable (personal appointments, other jobs).',
      'Booking confirmations go to the customer by text and to you in the admin dashboard.',
      'Cancel and reschedule requests handled by the AI over phone or SMS — calendar updates automatically.',
      'Works with your existing Google Calendar.',
    ],
  },
]

export default function PitchPage() {
  return (
    <div className="min-h-screen bg-[#f6f5f1]">
      {/* Header */}
      <div className="border-b border-black/10 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-gray-900">
            CloudGreet
          </Link>
          <a
            href="mailto:hello@cloudgreet.com"
            className="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
          >
            Get started
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16">

        {/* Title */}
        <div className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">What we do</p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Every feature, in one place.
          </h1>
          <p className="mt-3 text-base text-gray-500">
            CloudGreet handles the front-end of your business — calls, texts, bookings, and online presence — so you can focus on the work.
          </p>
        </div>

        {/* Feature index */}
        <div className="mb-16 rounded-2xl border border-black/[0.08] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-black/[0.06] px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Features</p>
          </div>
          <div className="divide-y divide-black/[0.06]">
            {features.map((f, i) => (
              <a
                key={f.id}
                href={`#${f.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs tabular-nums text-gray-300 w-4">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-medium text-gray-900">{f.name}</span>
                </div>
                <svg className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* Full descriptions */}
        <div className="space-y-16">
          {features.map((f, i) => (
            <div key={f.id} id={f.id} className="scroll-mt-8">
              <div className="mb-6 flex items-start gap-4">
                <span className="mt-1 text-xs tabular-nums text-gray-300 w-4 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">{f.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">{f.hook}</p>
                </div>
              </div>
              <div className="ml-8 rounded-2xl border border-black/[0.08] bg-white shadow-sm overflow-hidden">
                <ul className="divide-y divide-black/[0.06]">
                  {f.details.map((d, j) => (
                    <li key={j} className="flex items-start gap-3 px-5 py-3.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                      <span className="text-sm text-gray-600 leading-relaxed">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a href="#top" className="ml-8 mt-3 inline-block text-xs text-gray-400 hover:text-gray-600">
                Back to top
              </a>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-20 rounded-2xl bg-gray-900 px-8 py-10 text-center">
          <p className="text-lg font-semibold text-white">Ready to see it live?</p>
          <p className="mt-1 text-sm text-gray-400">We set everything up. You just answer fewer calls.</p>
          <a
            href="mailto:hello@cloudgreet.com"
            className="mt-6 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100"
          >
            Get in touch
          </a>
        </div>

      </div>
    </div>
  )
}
