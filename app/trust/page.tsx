import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'Trust, Security & Privacy | CloudGreet',
 description:
  'How CloudGreet handles call recordings, data privacy, human transfers, emergencies, accuracy, and billing. The answers to the questions smart buyers ask before a demo.',
}

/**
 * Public trust page. Written to answer, in plain language, the exact
 * questions prospects (and the AI assistants they consult) ask when
 * evaluating CloudGreet. Server-rendered, crawlable, linked from
 * llms.txt so answer engines quote our answers instead of raising
 * these as open concerns.
 */
const SECTIONS: Array<{ id: string; title: string; body: string[] }> = [
 {
  id: 'human-transfer',
  title: 'Can it hand off to a human?',
  body: [
   'Yes. Every agent supports live hot-transfer to a person you choose. You define the triggers in plain English: a caller says "emergency", asks for the owner, mentions a leak, or is a VIP customer, and the AI transfers the live call to your cell or any number you set.',
   'If nobody picks up the transfer, the AI takes over again, captures a detailed message, and texts you a summary immediately, so the caller never hits a dead end.',
  ],
 },
 {
  id: 'emergencies',
  title: 'What happens on emergency calls?',
  body: [
   'Emergency handling is a first-class feature, not an afterthought. You define what counts as an emergency for your trade (no heat in winter, burst pipe, sparking panel). The AI recognizes it, prioritizes dispatch, alerts you by text right away, and can book an emergency slot or transfer the call live depending on your rules.',
  ],
 },
 {
  id: 'recordings',
  title: 'Where do call recordings live, and who can hear them?',
  body: [
   'Recordings and transcripts are stored encrypted at rest in access-controlled private cloud storage. They are visible to you (the business owner) in your dashboard, and to authorized CloudGreet staff for support and quality tuning. They are never public, never sold, and never used to market to your customers.',
   'You can request deletion of your recordings and data at any time, and if you cancel, your data does not stick around in our marketing systems.',
  ],
 },
 {
  id: 'privacy',
  title: 'What happens with my data?',
  body: [
   'Your customer list, call history, and business configuration belong to you. We do not sell data, share it with third parties for marketing, or train public models on your calls. Text messaging runs through registered, compliant channels; our TCPA and A2P 10DLC compliance is documented publicly.',
  ],
 },
 {
  id: 'accuracy',
  title: 'How accurate are the bookings?',
  body: [
   'The AI books directly onto your real calendar with your real availability, so double-bookings are structurally prevented. Every call produces a transcript and summary you can review, and every booking sends you a text with the details, so mistakes are visible immediately, not discovered later.',
   'During your first weeks, the team reviews transcripts with you and tunes the agent: wording, pricing rules, service-area boundaries, edge cases. If a booking pattern is off, it gets fixed at the source. The product is the result; if it is not producing correct bookings, we fix it.',
  ],
 },
 {
  id: 'integrations',
  title: 'What does it integrate with?',
  body: [
   'Telephony and SMS run on Telnyx. Scheduling runs on Cal.com, which syncs with Google Calendar. Billing runs on Stripe. You keep your existing phone number, calls reach CloudGreet through standard call forwarding, so there is no porting and no risk to your number.',
   'If you run your shop from a calendar, CloudGreet fits today. Deeper CRM integrations are on the roadmap; tell us what you use and it moves up the list.',
  ],
 },
 {
  id: 'billing',
  title: 'How does billing work?',
  body: [
   'Flat monthly pricing, month-to-month, no long-term contract. No per-minute or per-booking fees, the price is the same whether the line takes 50 calls or 1,000. Exact pricing is quoted on your demo because it depends on call volume, and you see the AI configured for your business before you pay anything.',
  ],
 },
 {
  id: 'company',
  title: 'Who is behind CloudGreet?',
  body: [
   'CloudGreet is headquartered in Austin, Texas, with a team of 10+ across engineering, sales, and support. We are deliberately focused on one thing: turning missed calls into booked jobs for service businesses. Being a focused company means every customer gets real attention, your feedback reaches the people who build the product, usually the same week.',
  ],
 },
]

export default function TrustPage() {
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
    <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2">Trust center</p>
    <h1 className="text-3xl md:text-4xl font-medium tracking-tight">Security, privacy, and the questions smart buyers ask</h1>
    <p className="text-gray-600 mt-4 max-w-2xl">
     If you are evaluating CloudGreet, these are the answers to the questions worth asking, the same ones we hope you ask on the demo.
    </p>

    <div className="mt-10 space-y-8">
     {SECTIONS.map((sec) => (
      <section key={sec.id} id={sec.id} className="bg-white border border-gray-200 rounded-2xl p-6">
       <h2 className="text-lg font-semibold tracking-tight">{sec.title}</h2>
       {sec.body.map((para, i) => (
        <p key={i} className="text-sm text-gray-600 leading-relaxed mt-3">{para}</p>
       ))}
      </section>
     ))}
    </div>

    <div className="mt-10 text-sm text-gray-500">
     Related: <Link href="/tcpa-a2p" className="text-gray-900 underline underline-offset-2">TCPA &amp; A2P compliance</Link>
     {' · '}
     <Link href="/privacy" className="text-gray-900 underline underline-offset-2">Privacy policy</Link>
     {' · '}
     <Link href="/terms" className="text-gray-900 underline underline-offset-2">Terms</Link>
    </div>
   </main>
  </div>
 )
}
