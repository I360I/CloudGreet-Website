"use client"

import React from 'react'
import Link from 'next/link'
import {
 Phone, ArrowUpRight, ArrowRight, Calendar, Clock, DollarSign, Star,
 PhoneIncoming, MessageSquare, FileText, PhoneForwarded, CheckCircle2,
 MapPin, ShieldCheck,
} from 'lucide-react'

const DEMO_NUMBER = '+1 (737) 937-0084'
const DEMO_TEL = 'tel:+17379370084'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   <Nav />
   <Hero />
   <ProductCard />
   <Platforms />
   <Stats />
   <CallFlow />
   <DashboardPreview />
   <Pricing />
   <FinalCTA />
   <FooterCard />
  </main>
 )
}

/* ----------------------------- Nav ----------------------------- */

function Nav() {
 return (
  <nav className="sticky top-0 z-50 bg-[#f6f5f1]/80 backdrop-blur-md border-b border-black/5">
   <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <Link href="/" className="flex items-center gap-2">
     <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center">
      <Phone className="w-4 h-4 text-white" />
     </div>
     <span className="font-semibold text-lg tracking-tight">CloudGreet</span>
    </Link>
    <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
     <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
     <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
     <Link href="/login" className="hover:text-gray-900 transition-colors">Sign in</Link>
    </div>
    <Link
     href="/contact"
     className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
    >
     Book Demo
     <ArrowUpRight className="w-4 h-4" />
    </Link>
   </div>
  </nav>
 )
}

/* ----------------------------- Hero ----------------------------- */

function Hero() {
 return (
  <section className="px-6 pt-32 md:pt-44 pb-32 md:pb-48">
   <div className="max-w-6xl mx-auto text-center">
    <h1 className="font-display font-medium tracking-tight leading-[1.05] text-[44px] sm:text-[56px] md:text-[72px] lg:text-[80px] mb-8 text-gray-900">
     Stop losing <span className="text-gray-400">profit</span>
     <br />
     to voicemail.
    </h1>
    <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto mb-12 leading-relaxed">
     Answers calls, books jobs, organizes details and keeps customers happy.
    </p>
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
     <a
      href={DEMO_TEL}
      className="group inline-flex items-center gap-3 bg-white text-gray-900 px-7 py-4 rounded-2xl text-base font-medium border border-gray-200 hover:border-gray-300 transition-all shadow-[0_0_60px_-10px_rgba(56,189,248,0.45)] hover:shadow-[0_0_80px_-10px_rgba(56,189,248,0.55)]"
     >
      Call our AI
      <span className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-gray-900 transition-colors">
       <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
     </a>
     <Link
      href="/contact"
      className="inline-flex items-center gap-3 bg-gray-900 text-white px-7 py-4 rounded-2xl text-base font-medium hover:bg-gray-800 transition-colors"
     >
      Book Demo
      <ArrowUpRight className="w-5 h-5" strokeWidth={2} />
     </Link>
    </div>
    <p className="text-sm text-gray-400 mt-8">
     Or call <a href={DEMO_TEL} className="font-medium text-gray-700 hover:text-gray-900">{DEMO_NUMBER}</a>
    </p>
   </div>
  </section>
 )
}

/* ------------------------ Product card ------------------------- */

function ProductCard() {
 return (
  <section className="px-6 pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto bg-white rounded-[32px] border border-gray-200/80 shadow-[0_0_80px_-20px_rgba(56,189,248,0.25)] p-8 md:p-16">
    <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
     <PhoneTranscript />
     <div className="text-xl md:text-2xl lg:text-3xl leading-[1.4] text-gray-400 font-normal">
      Meet the <strong className="text-gray-900 font-semibold">AI agent</strong> that connects to your phone line,{' '}
      <strong className="text-gray-900 font-semibold">answers</strong> calls, handles{' '}
      <strong className="text-gray-900 font-semibold">questions</strong>, books{' '}
      <strong className="text-gray-900 font-semibold">appointments</strong>, transfers calls, takes{' '}
      <strong className="text-gray-900 font-semibold">notes</strong>, and more.
     </div>
    </div>
   </div>
  </section>
 )
}

function PhoneTranscript() {
 const lines: { who: 'ai' | 'caller'; text: string }[] = [
  { who: 'ai', text: "Hi, thanks for calling Mike's HVAC, this is the virtual receptionist. How can I help?" },
  { who: 'caller', text: "My AC stopped blowing cold this morning." },
  { who: 'ai', text: "Sorry to hear that. I can get a tech out — Tuesday at 9 AM works. Should I book it?" },
  { who: 'caller', text: "Yes please." },
  { who: 'ai', text: "Booked. You'll get a confirmation text. Anything else?" },
 ]
 return (
  <div className="relative">
   <div className="absolute -inset-6 bg-sky-100/50 blur-2xl rounded-3xl pointer-events-none" />
   <div className="relative bg-gray-50 border border-gray-200 rounded-3xl p-5 md:p-6">
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
     <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center">
      <Phone className="w-4 h-4 text-white" />
     </div>
     <div>
      <div className="text-sm font-semibold text-gray-900">Live call</div>
      <div className="text-xs text-gray-500">CloudGreet AI &middot; 0:42</div>
     </div>
     <div className="ml-auto flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
      <span className="text-xs text-gray-500 font-medium">REC</span>
     </div>
    </div>
    <div className="space-y-2.5">
     {lines.map((l, i) => (
      <div key={i} className={`flex ${l.who === 'caller' ? 'justify-end' : 'justify-start'}`}>
       <div
        className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-snug ${
         l.who === 'ai'
          ? 'bg-white border border-gray-200 text-gray-800'
          : 'bg-gray-900 text-white'
        }`}
       >
        {l.text}
       </div>
      </div>
     ))}
    </div>
   </div>
  </div>
 )
}

/* --------------------------- Platforms ------------------------- */

function Platforms() {
 const items = ['Stripe', 'Telnyx', 'Retell', 'Google Calendar', 'Outlook', 'Twilio']
 return (
  <section className="px-6 pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto text-center">
    <p className="text-sm text-gray-500 mb-6">CloudGreet works with the tools you already use</p>
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-gray-400">
     {items.map((p) => (
      <span key={p} className="text-base md:text-lg font-medium">{p}</span>
     ))}
    </div>
   </div>
  </section>
 )
}

/* ----------------------------- Stats --------------------------- */

function Stats() {
 const items = [
  { icon: Clock, value: '5+ hrs/week', label: 'saved on the phone' },
  { icon: DollarSign, value: '$2,500/mo', label: 'recovered from missed calls' },
  { icon: Calendar, value: '24/7', label: 'coverage, never miss a call' },
  { icon: Star, value: '+1.2 stars', label: 'in average review ratings' },
 ]
 return (
  <section className="px-6 pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto">
    <p className="text-sm text-gray-500 text-center mb-6">Results on average per client</p>
    <div className="grid sm:grid-cols-2 gap-4 relative">
     <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />
     {items.map(({ icon: Icon, value, label }) => (
      <div key={value} className="relative bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center justify-between">
       <Icon className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
       <div className="text-right">
        <span className="text-base md:text-lg font-semibold text-gray-900">{value}</span>
        <span className="text-base md:text-lg text-gray-500"> {label}</span>
       </div>
      </div>
     ))}
    </div>
   </div>
  </section>
 )
}

/* ---------------------------- Call flow ------------------------ */

function CallFlow() {
 return (
  <section id="how-it-works" className="px-6 pb-20">
   <div className="max-w-6xl mx-auto">
    <div className="grid md:grid-cols-4 gap-3 relative">
     <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />

     {/* Header card */}
     <div className="relative bg-white border border-gray-200 rounded-2xl p-6 md:row-span-2 flex items-end">
      <h2 className="font-display text-3xl md:text-4xl font-medium tracking-tight leading-[1]">
       Basic
       <br />
       Call
       <br />
       Flow.
      </h2>
     </div>

     <FlowCard icon={PhoneIncoming} title="Incoming call." body="Customer dials your main number — no new lines needed." />
     <FlowCard icon={Phone} title="AI agent answers." body="Picks up instantly or after a set number of rings." wide />

     <FlowCard
      icon={MessageSquare}
      title="Call is handled."
      body={
       <>
        The AI talks <strong>naturally</strong> with the caller. From{' '}
        <strong>common</strong> and <strong>complex</strong> questions to managing{' '}
        <strong>appointments</strong> and anything else it&apos;s trained for.
        <br />
        <br />
        If it&apos;s outside scope, the AI <strong>transfers</strong> the call to your team.
       </>
      }
      tall
     />

     <FlowCard icon={FileText} title="Summary sent." body="Name, number, and reason for calling sent instantly to you by SMS." />
     <FlowCard icon={PhoneForwarded} title="Ends or transfers." body="Resolved calls end. Others are passed to your team." />
    </div>
   </div>
  </section>
 )
}

function FlowCard({
 icon: Icon, title, body, wide = false, tall = false,
}: {
 icon: React.ElementType; title: string; body: React.ReactNode; wide?: boolean; tall?: boolean
}) {
 return (
  <div className={`relative bg-white border border-gray-200 rounded-2xl p-5 md:p-6 ${tall ? 'md:row-span-2' : ''} ${wide ? '' : ''}`}>
   <Icon className="w-5 h-5 text-gray-400 mb-4" strokeWidth={1.5} />
   <h3 className="font-display text-lg md:text-xl font-medium tracking-tight mb-2 text-gray-900">{title}</h3>
   <div className="text-sm text-gray-600 leading-relaxed">{body}</div>
  </div>
 )
}

/* ---------------------- Dashboard preview ---------------------- */

function DashboardPreview() {
 const calls = [
  { name: 'Mike R.', when: '2 min ago', detail: 'Booked: AC repair Tue 9am', booked: true },
  { name: 'Sarah K.', when: '18 min ago', detail: 'Booked: Roof inspection Thu 2pm', booked: true },
  { name: 'John D.', when: '1 hr ago', detail: 'Message taken: callback requested', booked: false },
  { name: 'Lisa M.', when: '2 hrs ago', detail: 'Booked: Interior painting estimate', booked: true },
 ]
 const appts = [
  { name: 'Mike R.', when: 'Tue 9:00 AM', service: 'AC repair · 4421 Burnet Rd' },
  { name: 'Sarah K.', when: 'Thu 2:00 PM', service: 'Roof inspection · 1208 W 38th' },
  { name: 'David T.', when: 'Fri 10:30 AM', service: 'HVAC tune-up · 902 E Cesar Chavez' },
  { name: 'Lisa M.', when: 'Mon 1:00 PM', service: 'Interior painting estimate' },
 ]
 return (
  <section className="px-6 pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto text-center mb-8">
    <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-4">
     Every call. <span className="text-gray-400">Every appointment.</span>
    </h2>
    <p className="text-base md:text-lg text-gray-500">One screen.</p>
   </div>
   <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-4 relative">
    <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />

    <div className="relative bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
     <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold flex items-center gap-2">
       <Phone className="w-4 h-4 text-sky-500" /> Recent Calls
      </h3>
      <span className="text-xs text-gray-400">Today</span>
     </div>
     <div className="space-y-3">
      {calls.map((c) => (
       <div key={c.name} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${c.booked ? 'bg-sky-500' : 'bg-gray-300'}`} />
        <div className="flex-1 min-w-0 text-left">
         <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{c.when}</span>
         </div>
         <p className="text-xs text-gray-600 mt-0.5">{c.detail}</p>
        </div>
       </div>
      ))}
     </div>
    </div>

    <div className="relative bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
     <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold flex items-center gap-2">
       <Calendar className="w-4 h-4 text-sky-500" /> Upcoming Appointments
      </h3>
      <span className="text-xs text-gray-400">This week</span>
     </div>
     <div className="space-y-3">
      {appts.map((a) => (
       <div key={a.name + a.when} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
        <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-sky-500" />
        <div className="flex-1 min-w-0 text-left">
         <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{a.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{a.when}</span>
         </div>
         <p className="text-xs text-gray-600 mt-0.5">{a.service}</p>
        </div>
       </div>
      ))}
     </div>
    </div>
   </div>
  </section>
 )
}

/* ----------------------------- Pricing ------------------------- */

function Pricing() {
 return (
  <section id="pricing" className="px-6 pb-20">
   <div className="max-w-6xl mx-auto text-center mb-10">
    <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-4">
     Simple, <span className="text-gray-400">flat pricing.</span>
    </h2>
    <p className="text-base md:text-lg text-gray-500">Two plans. No per-booking fees. No surprises.</p>
   </div>

   <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4 relative">
    <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />

    <PriceCard
     name="Starter"
     desc="After-hours coverage only"
     price="$499"
     features={[
      'AI answers calls outside business hours',
      'Lead qualification & message capture',
      'Calendar booking & SMS confirmations',
      'Missed-call recovery texts',
      'Call recordings & transcripts',
      'Dashboard & ROI tracking',
     ]}
    />
    <PriceCard
     name="Full 24/7"
     desc="Around-the-clock coverage"
     price="$899"
     popular
     features={[
      'AI answers every call, 24/7',
      'Lead qualification & message capture',
      'Calendar booking & SMS confirmations',
      'Missed-call recovery texts',
      'Call recordings & transcripts',
      'Dashboard & ROI tracking',
      'Custom business greeting',
      'Google & Microsoft Calendar integration',
     ]}
    />
   </div>
  </section>
 )
}

function PriceCard({
 name, desc, price, features, popular = false,
}: {
 name: string; desc: string; price: string; features: string[]; popular?: boolean
}) {
 return (
  <div className={`relative bg-white border ${popular ? 'border-gray-900' : 'border-gray-200'} rounded-2xl p-6 md:p-8 text-left`}>
   {popular && (
    <div className="absolute -top-3 left-6 bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-medium">
     Most Popular
    </div>
   )}
   <h3 className="font-display text-2xl font-semibold text-gray-900 mb-1">{name}</h3>
   <p className="text-sm text-gray-500 mb-5">{desc}</p>
   <div className="mb-6 flex items-baseline gap-2">
    <span className="font-display text-4xl md:text-5xl font-medium tracking-tight text-gray-900">{price}</span>
    <span className="text-base text-gray-500">/mo</span>
   </div>
   <div className="space-y-2.5 mb-7">
    {features.map((f) => (
     <div key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
      <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
      <span>{f}</span>
     </div>
    ))}
   </div>
   <Link
    href="/contact"
    className={`block w-full text-center px-4 py-3 rounded-full text-sm font-medium transition-colors ${
     popular
      ? 'bg-gray-900 text-white hover:bg-gray-800'
      : 'bg-white border border-gray-200 text-gray-900 hover:border-gray-400'
    }`}
   >
    Book Demo
   </Link>
  </div>
 )
}

/* --------------------------- Final CTA ------------------------- */

function FinalCTA() {
 return (
  <section className="px-6 pb-12">
   <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-200 p-8 md:p-12 grid md:grid-cols-2 gap-6 items-center relative overflow-hidden">
    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-sky-100/60 blur-3xl rounded-full pointer-events-none" />
    <div className="relative">
     <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05]">
      Stop losing calls.
      <br />
      <span className="text-gray-400">Start winning customers.</span>
     </h2>
     <p className="text-gray-600 mt-4">Book a 15-min 1:1 demo to see if you&apos;re a fit.</p>
    </div>
    <div className="relative flex md:justify-end">
     <div className="bg-[#f6f5f1] rounded-2xl p-6 md:p-8 w-full md:max-w-sm">
      <Link
       href="/contact"
       className="inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-4 rounded-full text-base font-medium hover:bg-gray-800 transition-colors w-full justify-center"
      >
       Book Demo
       <ArrowUpRight className="w-4 h-4" />
      </Link>
      <p className="text-xs text-gray-500 mt-3 text-center">No setup fee for the first 5 Texas pilot customers.</p>
     </div>
    </div>
   </div>
  </section>
 )
}

/* ---------------------------- Footer --------------------------- */

function FooterCard() {
 return (
  <section className="px-6 pb-12">
   <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-200 p-8 md:p-10">
    <div className="grid md:grid-cols-4 gap-8">
     <div>
      <Link href="/" className="flex items-center gap-2 mb-3">
       <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center">
        <Phone className="w-4 h-4 text-white" />
       </div>
       <span className="font-semibold text-lg tracking-tight">CloudGreet</span>
      </Link>
      <p className="text-sm text-gray-500 flex items-center gap-1.5">
       <MapPin className="w-3.5 h-3.5" /> Built in Austin, TX
      </p>
     </div>
     <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Menu</h4>
      <ul className="space-y-2 text-sm text-gray-600">
       <li><Link href="/" className="hover:text-gray-900">Home</Link></li>
       <li><Link href="/contact" className="hover:text-gray-900">Contact</Link></li>
       <li><Link href="/login" className="hover:text-gray-900">Sign in</Link></li>
      </ul>
     </div>
     <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Legal</h4>
      <ul className="space-y-2 text-sm text-gray-600">
       <li><Link href="/privacy" className="hover:text-gray-900">Privacy</Link></li>
       <li><Link href="/terms" className="hover:text-gray-900">Terms</Link></li>
       <li><Link href="/tcpa-a2p" className="hover:text-gray-900">TCPA / A2P</Link></li>
      </ul>
     </div>
     <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact</h4>
      <ul className="space-y-2 text-sm text-gray-600">
       <li><a href={DEMO_TEL} className="hover:text-gray-900">{DEMO_NUMBER}</a></li>
       <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> 30-day money-back</li>
      </ul>
     </div>
    </div>
    <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-400">
     © {new Date().getFullYear()} CloudGreet · Serving Texas contractors
    </div>
   </div>
  </section>
 )
}
