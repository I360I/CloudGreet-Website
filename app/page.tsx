"use client"

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
 Phone, ArrowUpRight, ArrowRight, Calendar, Clock, DollarSign, Star,
 PhoneIncoming, MessageSquare, FileText, PhoneForwarded, CheckCircle2,
 MapPin, ShieldCheck, Zap, BellRing, Languages, Workflow,
} from "lucide-react"

const DEMO_NUMBER = '+1 (737) 937-0084'
const DEMO_TEL = 'tel:+17379370084'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   <Nav />
   <Hero />
   <ProductCard />
   <Capabilities />
   <CallFlow />
   <DashboardPreview />
   <Platforms />
   <RoiCalculator />
   <FinalCTA />
   <FooterCard />
  </main>
 )
}

/* ----------------------------- Nav ----------------------------- */

function Nav() {
 return (
  <nav className="sticky top-0 z-50 bg-[#f6f5f1]/80 backdrop-blur-md border-b border-black/5">
   <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
    <Link href="/" className="flex items-center" aria-label="CloudGreet">
     <Image
      src="/cloudgreet-logo.png"
      alt="CloudGreet"
      width={160}
      height={48}
      priority
      className="h-9 w-auto"
     />
    </Link>
    <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <a href="#pricing" className="hover:text-gray-900 transition-colors">ROI Calculator</a>
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
  <section className="px-5 sm:px-6 pt-20 sm:pt-32 md:pt-44 pb-20 sm:pb-32 md:pb-48">
   <div className="max-w-6xl mx-auto text-center">
    <h1 className="font-display font-medium tracking-tight leading-[1.05] text-[34px] xs:text-[40px] sm:text-[56px] md:text-[72px] lg:text-[80px] mb-6 sm:mb-8 text-gray-900">
     Stop losing <span className="text-gray-400">profit</span>
     <br />
     to voicemail.
    </h1>
    <p className="text-base md:text-lg text-gray-500 max-w-xl mx-auto mb-8 sm:mb-12 leading-relaxed px-2">
     A 24/7 AI receptionist for service businesses. Answers every call, books jobs straight into your calendar, and texts you a summary before the caller hangs up.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
     <a
      href={DEMO_TEL}
      className="group inline-flex items-center justify-center gap-3 bg-white text-gray-900 px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-medium border border-gray-200 hover:border-gray-300 transition-all shadow-[0_0_60px_-10px_rgba(56,189,248,0.45)] hover:shadow-[0_0_80px_-10px_rgba(56,189,248,0.55)]"
     >
      Call our AI
      <span className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-gray-900 transition-colors">
       <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
     </a>
     <Link
      href="/contact"
      className="inline-flex items-center justify-center gap-3 bg-gray-900 text-white px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-medium hover:bg-gray-800 transition-colors"
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
  <section className="px-5 sm:px-6 pb-16 sm:pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto bg-white rounded-3xl sm:rounded-[32px] border border-gray-200/80 shadow-[0_0_80px_-20px_rgba(56,189,248,0.25)] p-5 sm:p-8 md:p-16">
    <div className="grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center">
     <PhoneTranscript />
     <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl leading-[1.4] text-gray-400 font-normal">
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
  { who: 'ai', text: "Sorry to hear that. I can get a tech out - Tuesday at 9 AM works. Should I book it?" },
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

/* --------------------------- Capabilities ----------------------- */
/**
 * Replaces the old made-up stats grid with concrete capability cards.
 * Every claim here is something the product actually does, so we can
 * stand behind it with no asterisk.
 */
function Capabilities() {
 const items = [
  {
   icon: Clock,
   title: '24/7 coverage',
   body: 'Picks up the moment a call comes in - middle of the night, weekends, holidays, all of it.',
  },
  {
   icon: Calendar,
   title: 'Books straight into your calendar',
   body: 'Two-way sync with Google Calendar, Outlook, or Cal.com. Real availability, no double-booking.',
  },
  {
   icon: BellRing,
   title: 'Instant SMS summary',
   body: 'You get the caller\'s name, number, and reason for calling on your phone before the call ends.',
  },
  {
   icon: Zap,
   title: 'Sounds human',
   body: 'Natural conversation, no robotic phone tree. Pick the voice and tone that fits your brand.',
  },
  {
   icon: Workflow,
   title: 'Hot transfers when you want',
   body: 'Set rules - VIPs, emergencies, certain words - and it routes the call to your team live.',
  },
  {
   icon: Languages,
   title: 'Bilingual out of the box',
   body: 'Switches between English and Spanish automatically based on what the caller speaks.',
  },
 ]
 return (
  <section className="px-5 sm:px-6 pb-16 sm:pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto">
    <div className="text-center mb-10">
     <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-4">
      What it actually <span className="text-gray-400">does.</span>
     </h2>
     <p className="text-base md:text-lg text-gray-500 max-w-xl mx-auto">
      No marketing fluff. These are the real capabilities you get on day one.
     </p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 relative">
     <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />
     {items.map(({ icon: Icon, title, body }) => (
      <div key={title} className="relative bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
       <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-sky-600" strokeWidth={1.75} />
       </div>
       <h3 className="font-display text-lg font-medium tracking-tight mb-2 text-gray-900">{title}</h3>
       <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
      </div>
     ))}
    </div>
   </div>
  </section>
 )
}

/* --------------------------- Platforms ------------------------- */
/**
 * Real integration logos as inline SVGs (no external image deps,
 * loads instantly, scales perfectly). Hover lifts each mark out of
 * the muted gray to full color.
 */
function Platforms() {
 return (
  <section className="px-5 sm:px-6 pb-16 sm:pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto">
    <div className="text-center mb-8">
     <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-3">
      Integrations
     </p>
     <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight leading-[1.1] text-gray-900">
      Plugs into the tools you already use.
     </h2>
    </div>
    <div className="bg-white border border-gray-200 rounded-2xl px-6 py-8 md:py-10 grid grid-cols-3 sm:grid-cols-6 gap-6 items-center">
     <LogoStripe />
     <LogoGoogleCalendar />
     <LogoOutlook />
     <LogoCalCom />
     <LogoTwilio />
     <LogoTelnyx />
    </div>
   </div>
  </section>
 )
}

const logoCls =
 'h-7 md:h-8 w-auto mx-auto opacity-50 hover:opacity-100 transition-opacity grayscale hover:grayscale-0'

function LogoStripe() {
 return (
  <svg viewBox="0 0 60 25" className={logoCls} aria-label="Stripe">
   <path
    fill="#635BFF"
    d="M59.64 14.28h-8.06v-1.13c0-3.13 2.53-5.66 5.66-5.66h.74v3.13h-.74c-1.4 0-2.53 1.13-2.53 2.53h4.93v1.13Zm-9.27-3.79c0-2.4-1.95-4.34-4.34-4.34s-4.34 1.94-4.34 4.34c0 2.39 1.95 4.34 4.34 4.34a4.34 4.34 0 0 0 4.34-4.34Zm-3.13 0c0 .67-.55 1.21-1.21 1.21-.67 0-1.21-.54-1.21-1.21s.54-1.21 1.21-1.21c.66 0 1.21.54 1.21 1.21Zm-9.96 7.55h3.13v-13H37.28v13ZM31.28 6.49c0-.93-.76-1.69-1.69-1.69h-2.45v3.39h2.45c.93 0 1.69-.76 1.69-1.69Zm-1.69-4.83a4.83 4.83 0 0 1 4.83 4.83c0 1.96-1.18 3.65-2.86 4.4l3.34 7.4h-3.43l-2.87-6.39h-1.46v6.39h-3.13V1.66h5.58Zm-9.06 14.71v3.13h-3.13v-3.13c-2.39 0-4.34-1.94-4.34-4.34V1.66h3.13V12c0 .67.54 1.21 1.21 1.21h3.13Zm-9.43-9.69H8c-.67 0-1.21.54-1.21 1.21v.74h4.34v3.13H6.79v.74c0 .67.54 1.21 1.21 1.21h3.09v3.13H8a4.34 4.34 0 0 1-4.34-4.34V6.21A4.34 4.34 0 0 1 8 1.86h3.09v3.13Z"
   />
  </svg>
 )
}

function LogoGoogleCalendar() {
 return (
  <svg viewBox="0 0 48 48" className={logoCls} aria-label="Google Calendar">
   <path fill="#fff" d="M37 12H11v26h26z"/>
   <path fill="#1A73E8" d="M22.385 27.738c-.512-.348-.866-.857-1.058-1.529l1.434-.591c.107.408.295.724.561.948.265.224.589.335.967.335.387 0 .719-.117.997-.353.278-.235.418-.535.418-.898 0-.371-.146-.677-.44-.916-.293-.239-.661-.358-1.103-.358h-.829v-1.42h.745c.381 0 .701-.103.962-.309.26-.206.391-.488.391-.846 0-.319-.117-.572-.351-.762-.234-.19-.529-.286-.887-.286-.349 0-.626.092-.832.279-.206.187-.359.418-.448.685l-1.42-.591c.155-.439.439-.827.855-1.16.416-.334.948-.503 1.594-.503.477 0 .907.092 1.288.276.381.184.682.44.901.766.219.327.327.694.327 1.101 0 .415-.1.766-.301 1.054-.2.288-.447.508-.74.661v.084c.387.163.701.41.945.745.244.334.366.733.366 1.198 0 .465-.118.881-.354 1.247-.236.366-.563.654-.978.864-.416.21-.884.316-1.402.316-.6 0-1.155-.174-1.667-.521v-.001Zm7.74-6.255-1.575 1.139-.787-1.193 2.825-2.038h1.082v9.617h-1.546v-7.525h.001Z"/>
   <path fill="#EA4335" d="M37 38v6l6-6z"/>
   <path fill="#34A853" d="M43 12v32h-6V12z"/>
   <path fill="#188038" d="M37 38v6h-26v-6z"/>
   <path fill="#1967D2" d="M37 4H11C8.79 4 7 5.79 7 8v30c0 2.21 1.79 4 4 4h26V12H11V8h26z"/>
   <path fill="#FBBC04" d="M5 12h6v26H5z" transform="rotate(90 8 25)"/>
   <path fill="#1A73E8" d="M11 12V4h26v8z" opacity=".8"/>
  </svg>
 )
}

function LogoOutlook() {
 return (
  <svg viewBox="0 0 48 48" className={logoCls} aria-label="Microsoft Outlook">
   <path fill="#0364B8" d="M28 13h17.385C46.275 13 47 13.726 47 14.615v18.77c0 .89-.726 1.615-1.615 1.615H28V13Z"/>
   <path fill="#0078D4" d="M47 21H28v-8h17.385c.89 0 1.615.726 1.615 1.615V21Z"/>
   <path fill="#28A8EA" d="M28 21h19v8H28z"/>
   <path fill="#0078D4" d="M28 29h19v6.385c0 .89-.726 1.615-1.615 1.615H28v-8Z"/>
   <path fill="#14447D" d="M3 12.075v23.85L26 41V7L3 12.075Z"/>
   <path fill="#fff" d="M14.5 17.5C10.91 17.5 8 20.91 8 24.5s2.91 7 6.5 7 6.5-3.41 6.5-7-2.91-7-6.5-7Zm0 11.4c-2.43 0-4.4-2.32-4.4-4.9 0-2.58 1.97-4.9 4.4-4.9s4.4 2.32 4.4 4.9c0 2.58-1.97 4.9-4.4 4.9Z"/>
  </svg>
 )
}

function LogoCalCom() {
 return (
  <svg viewBox="0 0 200 50" className={logoCls} aria-label="Cal.com">
   <text x="0" y="38" fontFamily="ui-sans-serif, system-ui" fontSize="38" fontWeight="700" fill="#000">Cal.com</text>
  </svg>
 )
}

function LogoTwilio() {
 return (
  <svg viewBox="0 0 48 48" className={logoCls} aria-label="Twilio">
   <circle cx="24" cy="24" r="20" fill="#F22F46"/>
   <circle cx="17" cy="17" r="3.5" fill="#fff"/>
   <circle cx="31" cy="17" r="3.5" fill="#fff"/>
   <circle cx="17" cy="31" r="3.5" fill="#fff"/>
   <circle cx="31" cy="31" r="3.5" fill="#fff"/>
  </svg>
 )
}

function LogoTelnyx() {
 return (
  <svg viewBox="0 0 200 50" className={logoCls} aria-label="Telnyx">
   <text x="0" y="36" fontFamily="ui-sans-serif, system-ui" fontSize="32" fontWeight="700" fill="#00E3AA">Telnyx</text>
  </svg>
 )
}

/* ---------------------------- Call flow ------------------------ */

function CallFlow() {
 const steps = [
  { icon: PhoneIncoming, title: 'Incoming call.', body: 'Customer dials your main number - no new lines needed.' },
  { icon: Phone, title: 'AI agent answers.', body: 'Picks up instantly or after a set number of rings.' },
  { icon: MessageSquare, title: 'Call is handled.', body: 'AI talks naturally, answers questions, and books appointments.' },
  { icon: FileText, title: 'Summary sent.', body: 'Name, number, and reason for calling sent to you by SMS.' },
  { icon: PhoneForwarded, title: 'Ends or transfers.', body: 'Resolved calls end. Others are passed to your team.' },
 ]
 return (
  <section id="how-it-works" className="px-5 sm:px-6 pb-16 sm:pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto">
    <div className="text-center mb-10">
     <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-4">
      How it <span className="text-gray-400">works.</span>
     </h2>
     <p className="text-base md:text-lg text-gray-500">Five simple steps. No setup on your end.</p>
    </div>

    <div className="relative">
     <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />
     <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {steps.map((s, i) => (
       <div key={s.title} className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
         <span className="text-xs text-gray-400 font-medium">0{i + 1}</span>
         <s.icon className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-lg font-medium tracking-tight mb-2 text-gray-900">{s.title}</h3>
        <div className="text-sm text-gray-600 leading-relaxed">{s.body}</div>
       </div>
      ))}
     </div>
    </div>
   </div>
  </section>
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
  <section className="px-5 sm:px-6 pb-16 sm:pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto text-center mb-8">
    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-4">
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

/* ---------------------- ROI Calculator ------------------------- */

function RoiCalculator() {
 const [missedPerDay, setMissedPerDay] = useState(5)
 const [avgJobValue, setAvgJobValue] = useState(450)
 const [closeRate, setCloseRate] = useState(30)

 const { lostMonth, recoveredMonth } = useMemo(() => {
  const workDays = 22
  const missedPerMonth = missedPerDay * workDays
  const lostMonth = missedPerMonth * (closeRate / 100) * avgJobValue
  // Assume CloudGreet recovers ~70% of those missed jobs
  const recoveredMonth = lostMonth * 0.7
  return { lostMonth, recoveredMonth }
 }, [missedPerDay, avgJobValue, closeRate])

 const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

 return (
  <section id="pricing" className="px-5 sm:px-6 pb-16 sm:pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto text-center mb-10">
    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-4">
     See <span className="text-gray-400">your numbers.</span>
    </h2>
    <p className="text-base md:text-lg text-gray-500 max-w-md mx-auto">
     Drag the sliders to estimate what missed calls cost you each month.
    </p>
   </div>

   <div className="max-w-5xl mx-auto relative">
    <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />

    <div className="relative bg-white border border-gray-200 rounded-3xl sm:rounded-[32px] p-5 sm:p-6 md:p-12 grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-16 items-center">
     {/* Sliders */}
     <div className="space-y-8">
      <Slider
       label="Missed calls per day"
       value={missedPerDay}
       min={1}
       max={20}
       step={1}
       display={`${missedPerDay}`}
       onChange={setMissedPerDay}
      />
      <div>
       <div className="flex items-baseline justify-between mb-3">
        <label className="text-sm text-gray-600">Average job value</label>
        <div className="flex items-baseline">
         <span className="font-display text-xl font-medium text-gray-500 mr-1">$</span>
         <input
          type="number"
          min={50}
          step={50}
          value={avgJobValue}
          onChange={(e) => setAvgJobValue(Math.max(0, Number(e.target.value) || 0))}
          className="font-display text-xl font-medium text-gray-900 bg-transparent border-b border-gray-300 focus:border-gray-900 focus:outline-none w-28 text-right"
         />
        </div>
       </div>
       <input
        type="range"
        min={100}
        max={10000}
        step={50}
        value={Math.min(avgJobValue, 10000)}
        onChange={(e) => setAvgJobValue(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-sky-500
         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
         [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
         [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,1),0_0_0_5px_rgba(229,231,235,1)]"
       />
       <p className="text-xs text-gray-400 mt-1.5">Slider goes to $10k. Type any amount above.</p>
      </div>
      <Slider
       label="Booking rate on answered calls"
       value={closeRate}
       min={10}
       max={70}
       step={5}
       display={`${closeRate}%`}
       onChange={setCloseRate}
      />
     </div>

     {/* Results */}
     <div className="text-left">
      <div className="text-sm text-gray-500 mb-2">You&apos;re losing about</div>
      <div className="font-display text-5xl md:text-6xl font-medium tracking-tight text-gray-900 mb-1">
       {fmt(lostMonth)}
      </div>
      <div className="text-sm text-gray-500 mb-8">in revenue every month.</div>

      <div className="border-t border-gray-200 pt-6">
       <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-700 font-medium">CloudGreet recovers about</span>
        <span className="font-display text-2xl md:text-3xl font-medium text-sky-600">
         {fmt(recoveredMonth)}
        </span>
       </div>
       <div className="text-xs text-gray-500 mt-1">per month, based on a 70% recovery rate</div>
      </div>

      <Link
       href="/contact"
       className="mt-8 inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors w-full justify-center"
      >
       Book a Demo
       <ArrowUpRight className="w-4 h-4" />
      </Link>
     </div>
    </div>

    <p className="text-center text-xs text-gray-400 mt-6">
     Plans: $499/mo Starter (after-hours) · $899/mo Full 24/7. No per-booking fees.
    </p>
   </div>
  </section>
 )
}

function Slider({
 label, value, min, max, step, display, onChange,
}: {
 label: string; value: number; min: number; max: number; step: number; display: string; onChange: (n: number) => void
}) {
 return (
  <div>
   <div className="flex items-baseline justify-between mb-3">
    <label className="text-sm text-gray-600">{label}</label>
    <span className="font-display text-xl font-medium text-gray-900">{display}</span>
   </div>
   <input
    type="range"
    min={min}
    max={max}
    step={step}
    value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-sky-500
     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
     [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
     [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,1),0_0_0_5px_rgba(229,231,235,1)]"
   />
  </div>
 )
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
 return (
  <div className="flex items-baseline justify-between text-sm">
   <span className="text-gray-600">{label}</span>
   <span className={muted ? 'text-gray-500' : 'text-gray-900 font-medium'}>{value}</span>
  </div>
 )
}

/* --------------------------- Final CTA ------------------------- */

function FinalCTA() {
 return (
  <section className="px-6 pb-12">
   <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 md:p-12 grid md:grid-cols-2 gap-6 items-center relative overflow-hidden">
    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-sky-100/60 blur-3xl rounded-full pointer-events-none" />
    <div className="relative">
     <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.05]">
      Stop losing calls.
      <br />
      <span className="text-gray-400">Start winning customers.</span>
     </h2>
     <p className="text-gray-600 mt-4">Book a 15-min 1:1 demo to see if you&apos;re a fit.</p>
    </div>
    <div className="relative md:flex md:justify-end">
     <Link
      href="/contact"
      className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 sm:py-4 rounded-2xl text-base font-medium hover:bg-gray-800 transition-colors w-full md:w-auto md:min-w-[220px] whitespace-nowrap"
     >
      Book Demo
      <ArrowUpRight className="w-4 h-4" />
     </Link>
    </div>
   </div>
  </section>
 )
}

/* ---------------------------- Footer --------------------------- */

function FooterCard() {
 return (
  <section className="px-6 pb-12">
   <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 md:p-10">
    <div className="grid md:grid-cols-4 gap-8">
     <div>
      <Link href="/" className="flex items-center mb-3" aria-label="CloudGreet">
       <Image
        src="/cloudgreet-logo.png"
        alt="CloudGreet"
        width={160}
        height={48}
        className="h-8 w-auto"
       />
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
