"use client"

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
 Phone, ArrowUpRight, ArrowRight, Calendar, Clock,
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
     <a href="#roi" className="hover:text-gray-900 transition-colors">ROI</a>
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
  <section className="px-5 sm:px-6 pt-12 sm:pt-20 md:pt-24 pb-10 sm:pb-14 relative overflow-hidden">
   <div
    className="absolute inset-0 -z-10 pointer-events-none opacity-40"
    style={{
     backgroundImage:
      'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(56,189,248,0.18), transparent 70%)',
    }}
   />
   <div className="max-w-6xl mx-auto text-center">
    <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-gray-600 mb-7">
     <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
     Live AI receptionist - call it now
    </div>
    <h1 className="font-display font-medium tracking-tight leading-[1.05] text-[34px] xs:text-[40px] sm:text-[56px] md:text-[72px] lg:text-[80px] mb-6 sm:mb-8 text-gray-900">
     Stop losing <span className="text-gray-400">profit</span>
     <br />
     to voicemail.
    </h1>
    <p className="text-base md:text-lg text-gray-500 max-w-xl mx-auto mb-8 sm:mb-12 leading-relaxed px-2">
     A 24/7 AI receptionist for service businesses. Answers every call, books jobs straight into your calendar, and logs the full transcript and recording in your dashboard the second the call ends.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
     <a
      href={DEMO_TEL}
      className="group inline-flex items-center justify-center gap-3 bg-white text-gray-900 px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-medium border border-gray-200 hover:border-gray-300 transition-all shadow-[0_0_60px_-10px_rgba(56,189,248,0.45)] hover:shadow-[0_0_80px_-10px_rgba(56,189,248,0.55)]"
     >
      Try a live demo call
      <span className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-gray-900 transition-colors">
       <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
     </a>
     <Link
      href="/contact"
      className="inline-flex items-center justify-center gap-3 bg-gray-900 text-white px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-medium hover:bg-gray-800 transition-colors"
     >
      Book a 15-min demo
      <ArrowUpRight className="w-5 h-5" strokeWidth={2} />
     </Link>
    </div>
    <p className="text-sm text-gray-400 mt-8">
     Or call <a href={DEMO_TEL} className="font-medium text-gray-700 hover:text-gray-900">{DEMO_NUMBER}</a> and ask it anything.
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
   title: 'Live in your dashboard',
   body: 'Caller name, phone, full transcript, recording, and outcome - all in your dashboard within 30 seconds of the call ending.',
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
  <section className="px-5 sm:px-6 pt-6 pb-8 sm:pb-12">
   <div className="max-w-6xl mx-auto">
    <div className="text-center mb-6">
     <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">
      Plugs into the tools you already use
     </p>
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
  { icon: FileText, title: 'Logged to your dashboard.', body: 'Caller name, phone, full transcript, and recording show up within 30 seconds.' },
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
  <section id="roi" className="px-5 sm:px-6 pt-6 pb-12 sm:pb-16">
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

/* ---------------------------- Pricing -------------------------- */
/**
 * Two clear tiers. We highlight Full 24/7 as 'Most popular' because
 * it's the upsell we actually want and it removes the most friction
 * for service-business owners (most are losing calls during the day
 * too, not just after hours).
 */
function Pricing() {
 const tiers = [
  {
   name: 'After-hours',
   priceLabel: '$499',
   cadence: '/month',
   blurb: 'Picks up evenings, weekends, and holidays. Your team handles 9-5.',
   features: [
    'Coverage outside business hours',
    'Books straight into your calendar',
    'Full transcript + recording in your dashboard',
    'Hot transfer to on-call staff',
    'Bilingual English / Spanish',
    'Searchable call history',
   ],
   cta: 'Book Demo',
   popular: false,
  },
  {
   name: 'Full 24/7',
   priceLabel: '$899',
   cadence: '/month',
   blurb: 'Every call, all day, every day. The full receptionist replacement.',
   features: [
    '24/7 coverage - never miss a call',
    'Books straight into your calendar',
    'Full transcript + recording in your dashboard',
    'Hot transfer to on-call staff',
    'Bilingual English / Spanish',
    'Custom voice + greeting',
    'Call recordings + searchable transcripts',
    'Priority onboarding (live in 24 hrs)',
   ],
   cta: 'Book Demo',
   popular: true,
  },
 ]
 return (
  <section id="pricing-tiers" className="px-5 sm:px-6 pb-16 sm:pb-32 md:pb-40">
   <div className="max-w-6xl mx-auto">
    <div className="text-center mb-10">
     <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-3">
      Pricing
     </p>
     <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-4">
      Two plans. <span className="text-gray-400">No surprises.</span>
     </h2>
     <p className="text-base md:text-lg text-gray-500 max-w-xl mx-auto">
      Flat monthly. No per-booking fees, no per-minute fees, no contracts.
     </p>
    </div>

    <div className="grid md:grid-cols-2 gap-4 md:gap-6 relative max-w-4xl mx-auto">
     <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />
     {tiers.map((t) => (
      <div
       key={t.name}
       className={`relative bg-white rounded-3xl p-7 md:p-8 flex flex-col ${
        t.popular
         ? 'border-2 border-gray-900 shadow-[0_0_60px_-15px_rgba(56,189,248,0.45)]'
         : 'border border-gray-200'
       }`}
      >
       {t.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-mono uppercase tracking-[0.2em] px-3 py-1 rounded-full">
         Most popular
        </div>
       )}
       <div className="mb-5">
        <div className="text-sm text-gray-500 font-medium mb-1">{t.name}</div>
        <div className="flex items-baseline gap-1">
         <span className="font-display text-5xl md:text-6xl font-medium tracking-tight text-gray-900">
          {t.priceLabel}
         </span>
         <span className="text-sm text-gray-500">{t.cadence}</span>
        </div>
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">{t.blurb}</p>
       </div>

       <ul className="space-y-2.5 mb-7 flex-1">
        {t.features.map((f) => (
         <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
          <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
          <span>{f}</span>
         </li>
        ))}
       </ul>

       <Link
        href="/contact"
        className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-medium transition-colors ${
         t.popular
          ? 'bg-gray-900 text-white hover:bg-gray-800'
          : 'bg-white border border-gray-300 text-gray-900 hover:border-gray-900'
        }`}
       >
        {t.cta}
        <ArrowUpRight className="w-4 h-4" />
       </Link>
      </div>
     ))}
    </div>

    <div className="mt-10 max-w-md mx-auto">
     <PriceFootCard
      icon={<Phone className="w-4 h-4" />}
      title="Keep your number"
      body="We forward your existing line. No new numbers, no porting drama."
     />
    </div>
   </div>
  </section>
 )
}

function PriceFootCard({
 icon, title, body,
}: { icon: React.ReactNode; title: string; body: string }) {
 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5">
   <div className="flex items-center gap-2 mb-2">
    <span className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
     {icon}
    </span>
    <div className="text-sm font-medium text-gray-900">{title}</div>
   </div>
   <p className="text-xs text-gray-600 leading-relaxed">{body}</p>
  </div>
 )
}

/* ------------------------------ FAQ ---------------------------- */
/**
 * Accordion of objections we hear most on demo calls. No JS needed -
 * the native <details> element handles the open/close, which keeps
 * the page lean and works without hydration.
 */
function Faq() {
 const items = [
  {
   q: 'Does it actually sound human?',
   a: "Yes. It's a natural conversational AI, not a phone tree. You pick the voice and tone (warm, direct, formal, etc.) and we tune the greeting to your brand. Most callers don't realize they're not talking to a person - and the ones who do still get the help they called for.",
  },
  {
   q: 'Do I need a new phone number?',
   a: "No. You keep your existing business line. We give you a forwarding number to point your line at - same way you'd forward to an answering service. Your customers keep dialing the number they already know.",
  },
  {
   q: 'How fast can you get me set up?',
   a: "Most accounts go live within 24 to 48 hours of signup. We handle the call forwarding setup, the calendar sync, and the agent configuration. You spend about 15 minutes telling us how your business answers the phone today, and we take it from there.",
  },
  {
   q: 'What happens when the AI can\'t help?',
   a: "You set the rules. By default it takes a detailed message and logs everything in your dashboard right away. You can also configure hot transfers - certain keywords ('emergency', 'leak', 'fire'), specific callers (VIP list), or anything outside its scope routes the live call to whoever is on call.",
  },
  {
   q: 'Can I customize what it says?',
   a: "All of it. Greeting, services you offer, service area, business hours, FAQ answers, pricing rules, edge cases. There's a dashboard where you edit any of it in plain English and changes go live immediately. No 'submit a ticket and wait' nonsense.",
  },
  {
   q: 'What about Spanish-speaking callers?',
   a: "It detects the language automatically and switches. Bilingual is included on every plan, no extra config. Texas service businesses lose a lot of bookings because nobody on staff speaks Spanish - this fixes that.",
  },
  {
   q: 'How are calls billed - per minute, per booking?',
   a: "Neither. Flat monthly. We don't believe in per-call or per-booking fees because they punish you for being successful. Take 1,000 calls a month or 50 - the price is the same.",
  },
  {
   q: 'What if it doesn\'t work for my business?',
   a: "We work with you. If you're not seeing bookings come through in the first couple of weeks we'll dig into the call transcripts together, tune the script, and get it right. The product is the result for you - if it isn't producing, we're going to fix it.",
  },
 ]
 return (
  <section id="faq" className="px-5 sm:px-6 pb-16 sm:pb-32 md:pb-40">
   <div className="max-w-3xl mx-auto">
    <div className="text-center mb-10">
     <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-3">
      Frequently asked
     </p>
     <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-4">
      Real questions, <span className="text-gray-400">real answers.</span>
     </h2>
    </div>

    <div className="space-y-2">
     {items.map((item) => (
      <details
       key={item.q}
       className="group bg-white border border-gray-200 rounded-2xl px-5 py-4 sm:px-6 sm:py-5 [&_summary::-webkit-details-marker]:hidden"
      >
       <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
        <span className="text-base font-medium text-gray-900 leading-snug">
         {item.q}
        </span>
        <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 group-open:bg-gray-900 group-open:text-white transition-colors">
         <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3v10M3 8h10" className="group-open:opacity-0 transition-opacity" />
          <path d="M3 8h10" className="opacity-0 group-open:opacity-100 transition-opacity" />
         </svg>
        </span>
       </summary>
       <div className="text-sm text-gray-600 leading-relaxed mt-3 pt-3 border-t border-gray-100">
        {item.a}
       </div>
      </details>
     ))}
    </div>

    <div className="text-center mt-8 text-sm text-gray-500">
     Still have questions?{' '}
     <Link href="/contact" className="text-gray-900 underline underline-offset-4 hover:text-sky-600">
      Book a demo
     </Link>{' '}
     or call <a href={DEMO_TEL} className="text-gray-900 underline underline-offset-4 hover:text-sky-600">{DEMO_NUMBER}</a>.
    </div>
   </div>
  </section>
 )
}

/* ------------------------- Founder note ------------------------ */
/**
 * Honest founder beat in lieu of fake testimonials. Service-business
 * owners are sharp and a "5 stars from John D." block with no real
 * person behind it makes the whole site feel scammy. A real founder
 * note from a real person with a real reason for building this is
 * more credible.
 */
function FounderNote() {
 return (
  <section className="px-5 sm:px-6 pb-16 sm:pb-32 md:pb-40">
   <div className="max-w-3xl mx-auto">
    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 md:p-12 relative overflow-hidden">
     <div className="absolute -top-20 -right-20 w-72 h-72 bg-sky-100/50 blur-3xl rounded-full pointer-events-none" />
     <div className="relative">
      <div className="flex items-center gap-3 mb-5">
       <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-base font-medium">
        AE
       </div>
       <div>
        <div className="text-sm font-medium text-gray-900">Anthony Edwards</div>
        <div className="text-xs text-gray-500">Founder, CloudGreet</div>
       </div>
      </div>
      <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-4">
       <p>
        I started CloudGreet because I watched my own family's contractor business lose deals every week to voicemail. Five-star techs, ten-thousand-dollar jobs, gone because nobody picked up the phone at 6 PM on a Tuesday.
       </p>
       <p>
        Hiring an answering service is expensive and they sound like an answering service. Hiring a receptionist is more expensive and they go home at 5. The math never worked.
       </p>
       <p>
        CloudGreet is what I wish we'd had: a receptionist that sounds like one of your team, works every hour of every day, books straight into your calendar, and costs less than a single missed job per month.
       </p>
       <p className="text-gray-600">
        If you're losing calls, give me 15 minutes on a demo. If it's not a fit, I'll tell you straight. No sales theatre.
       </p>
      </div>
      <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
       <Link
        href="/contact"
        className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors"
       >
        Book 15 minutes
        <ArrowUpRight className="w-4 h-4" />
       </Link>
       <a
        href={DEMO_TEL}
        className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-900 px-6 py-3 rounded-2xl text-sm font-medium hover:border-gray-900 transition-colors"
       >
        Or call our AI yourself
        <ArrowRight className="w-4 h-4" />
       </a>
      </div>
     </div>
    </div>
   </div>
  </section>
 )
}

/* --------------------------- Final CTA ------------------------- */

function FinalCTA() {
 return (
  <section className="px-5 sm:px-6 pb-10">
   <div className="max-w-6xl mx-auto bg-gray-900 text-white rounded-3xl sm:rounded-[28px] px-7 sm:px-10 md:px-12 py-8 sm:py-9 md:py-10 relative overflow-hidden">
    <div className="absolute -top-20 -right-20 w-80 h-80 bg-sky-500/25 blur-3xl rounded-full pointer-events-none" />
    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-sky-500/15 blur-3xl rounded-full pointer-events-none" />
    <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10">
     <div className="max-w-xl">
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-sky-300 mb-3">
       Last thing
      </p>
      <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight leading-[1.1] mb-3">
       Every call you miss is money you don't make.
      </h2>
      <p className="text-sm md:text-base text-gray-300 leading-relaxed">
       CloudGreet picks up so you can stay on the job. Live demo line answers in two rings.
      </p>
     </div>
     <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:items-stretch md:min-w-[220px]">
      <a
       href={DEMO_TEL}
       className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-5 py-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
      >
       Call {DEMO_NUMBER}
       <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
      </a>
      <Link
       href="/contact"
       className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white px-5 py-3 rounded-xl text-sm font-medium border border-white/20 hover:border-white/30 backdrop-blur transition-colors"
      >
       Book a 15-min demo
       <ArrowUpRight className="w-4 h-4" />
      </Link>
     </div>
    </div>
    <div className="relative mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-400">
     <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Keep your number</span>
     <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Flat monthly, no per-call fees</span>
    </div>
   </div>
  </section>
 )
}

/* ---------------------------- Footer --------------------------- */

function FooterCard() {
 return (
  <section className="px-5 sm:px-6 pb-10">
   <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-200 p-7 sm:p-9 md:p-12">
    <div className="grid md:grid-cols-12 gap-8 md:gap-12">
     <div className="md:col-span-5">
      <Link href="/" className="inline-flex items-center mb-4" aria-label="CloudGreet">
       <Image
        src="/cloudgreet-logo.png"
        alt="CloudGreet"
        width={160}
        height={48}
        className="h-8 w-auto"
       />
      </Link>
      <p className="text-sm text-gray-600 leading-relaxed max-w-sm mb-4">
       The 24/7 AI receptionist for service businesses. Answers calls, books jobs, never sleeps.
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
       <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Austin, TX</span>
       <a href={DEMO_TEL} className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
        <Phone className="w-3.5 h-3.5" /> {DEMO_NUMBER}
       </a>
      </div>
     </div>

     <div className="md:col-span-2">
      <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-3">Product</h4>
      <ul className="space-y-2 text-sm text-gray-700">
       <li><a href="#roi" className="hover:text-sky-600 transition-colors">ROI calculator</a></li>
       <li><a href="#faq" className="hover:text-sky-600 transition-colors">FAQ</a></li>
       <li><Link href="/contact" className="hover:text-sky-600 transition-colors">Book a demo</Link></li>
      </ul>
     </div>

     <div className="md:col-span-2">
      <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-3">Company</h4>
      <ul className="space-y-2 text-sm text-gray-700">
       <li><Link href="/contact" className="hover:text-sky-600 transition-colors">Contact</Link></li>
       <li><Link href="/login" className="hover:text-sky-600 transition-colors">Sign in</Link></li>
       <li><Link href="/apply" className="hover:text-sky-600 transition-colors">Sales careers</Link></li>
      </ul>
     </div>

     <div className="md:col-span-3">
      <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-3">Legal</h4>
      <ul className="space-y-2 text-sm text-gray-700">
       <li><Link href="/privacy" className="hover:text-sky-600 transition-colors">Privacy policy</Link></li>
       <li><Link href="/terms" className="hover:text-sky-600 transition-colors">Terms of service</Link></li>
       <li><Link href="/tcpa-a2p" className="hover:text-sky-600 transition-colors">TCPA / A2P compliance</Link></li>
      </ul>
     </div>
    </div>
    <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-400">
     <div>© {new Date().getFullYear()} CloudGreet. All rights reserved.</div>
     <div className="flex items-center gap-1.5">
      <ShieldCheck className="w-3.5 h-3.5" /> Flat monthly, no per-call fees
     </div>
    </div>
   </div>
  </section>
 )
}
