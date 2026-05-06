"use client"

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const DEMO_NUMBER = '+1 (737) 937-0084'
const DEMO_TEL = 'tel:+17379370084'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   <Nav />
   <Hero />
   <LogoStrip />
   <RoiCalculator />
   <Footer />
  </main>
 )
}

/* ------------------------------ Nav ----------------------------- */

function Nav() {
 return (
  <nav className="sticky top-0 z-50 bg-[#f6f5f1]/80 backdrop-blur-md border-b border-black/5">
   <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-3">
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
    <div className="flex items-center gap-3 sm:gap-5">
     <Link href="/login" className="hidden sm:block text-sm text-gray-600 hover:text-gray-900 transition-colors">
      Sign in
     </Link>
     <Link
      href="/contact"
      className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
     >
      Book Demo
      <ArrowUpRight />
     </Link>
    </div>
   </div>
  </nav>
 )
}

/* ----------------------------- Hero ----------------------------- */
/**
 * Single dark gradient card. Shorter than the old final-CTA so it
 * fits comfortably on first scroll. This is the whole "above the
 * fold" pitch - no other sections compete for attention here.
 */
function Hero() {
 return (
  <section className="px-5 sm:px-6 pt-8 sm:pt-12">
   <div className="max-w-6xl mx-auto rounded-3xl sm:rounded-[32px] p-8 sm:p-12 md:p-16 relative overflow-hidden bg-[#0b1220] text-white">
    <div
     className="absolute inset-0 pointer-events-none"
     style={{
      background:
       'radial-gradient(ellipse 70% 80% at 90% 50%, rgba(56,189,248,0.22), transparent 60%), radial-gradient(ellipse 60% 60% at 0% 100%, rgba(99,102,241,0.18), transparent 60%)',
     }}
    />
    <div className="relative max-w-3xl">
     <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-sky-300 mb-5">
      AI receptionist for service businesses
     </p>
     <h1 className="font-display font-medium tracking-tight leading-[1.05] text-[40px] sm:text-[56px] md:text-[68px] mb-5">
      Every call you miss is money you don&apos;t make.
     </h1>
     <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8 max-w-xl">
      CloudGreet picks up the phone for you so you can stay on the job. Try the live demo line right now &mdash; it answers in two rings.
     </p>
     <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
      <a
       href={DEMO_TEL}
       className="inline-flex items-center justify-center gap-3 bg-white text-gray-900 px-7 py-4 rounded-2xl text-sm sm:text-base font-medium hover:bg-gray-100 transition-colors"
      >
       Call {DEMO_NUMBER}
       <ArrowRight />
      </a>
      <Link
       href="/contact"
       className="inline-flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 text-white px-7 py-4 rounded-2xl text-sm sm:text-base font-medium border border-white/15 hover:border-white/25 backdrop-blur transition-colors"
      >
       Book a 15-min demo
       <ArrowUpRight />
      </Link>
     </div>
     <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-2 text-xs text-gray-400">
      <span>30-day money-back</span>
      <span className="w-px h-3 bg-white/15" />
      <span>Keep your number</span>
      <span className="w-px h-3 bg-white/15" />
      <span>Live in 24-48 hours</span>
     </div>
    </div>
   </div>
  </section>
 )
}

/* --------------------------- Logo strip ------------------------- */
/**
 * Trust strip. Drop SVGs into /public/logos/ and they swap in here
 * automatically. While the SVGs aren't there, we render the brand
 * name in a refined wordmark style so the layout is correct and the
 * strip never breaks.
 *
 * Expected files (any of these can land later, code is tolerant):
 *   /public/logos/twilio.svg
 *   /public/logos/telnyx.svg
 *   /public/logos/stripe.svg
 *   /public/logos/google-calendar.svg
 *   /public/logos/outlook.svg
 *   /public/logos/calcom.svg
 */
function LogoStrip() {
 const logos: { name: string; file: string }[] = [
  { name: 'Twilio', file: '/logos/twilio.svg' },
  { name: 'Telnyx', file: '/logos/telnyx.svg' },
  { name: 'Stripe', file: '/logos/stripe.svg' },
  { name: 'Google Calendar', file: '/logos/google-calendar.svg' },
  { name: 'Outlook', file: '/logos/outlook.svg' },
  { name: 'Cal.com', file: '/logos/calcom.svg' },
 ]
 return (
  <section className="px-5 sm:px-6 pt-10 sm:pt-14 pb-2">
   <div className="max-w-6xl mx-auto">
    <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 text-center mb-5">
     Plugs into the tools you already use
    </p>
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-6 gap-y-6 items-center justify-items-center">
     {logos.map((l) => (
      <LogoMark key={l.name} name={l.name} file={l.file} />
     ))}
    </div>
   </div>
  </section>
 )
}

function LogoMark({ name, file }: { name: string; file: string }) {
 // Use Next/Image with onError fallback to a wordmark so layout is
 // stable while the SVG files are being added to /public/logos/.
 const [failed, setFailed] = useState(false)
 if (failed) {
  return (
   <span className="text-sm md:text-base font-medium tracking-tight text-gray-400 hover:text-gray-700 transition-colors">
    {name}
   </span>
  )
 }
 return (
  <img
   src={file}
   alt={name}
   onError={() => setFailed(true)}
   className="h-7 md:h-8 w-auto opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
  />
 )
}

/* -------------------------- ROI calculator ---------------------- */

function RoiCalculator() {
 const [missedPerDay, setMissedPerDay] = useState(5)
 const [avgJobValue, setAvgJobValue] = useState(450)
 const [closeRate, setCloseRate] = useState(30)

 const { lostMonth, recoveredMonth } = useMemo(() => {
  const workDays = 22
  const missedPerMonth = missedPerDay * workDays
  const lostMonth = missedPerMonth * (closeRate / 100) * avgJobValue
  const recoveredMonth = lostMonth * 0.7
  return { lostMonth, recoveredMonth }
 }, [missedPerDay, avgJobValue, closeRate])

 const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

 return (
  <section id="roi" className="px-5 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24">
   <div className="max-w-5xl mx-auto">
    <div className="text-center mb-10">
     <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-3">
      ROI calculator
     </p>
     <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-3">
      See <span className="text-gray-400">your numbers.</span>
     </h2>
     <p className="text-base md:text-lg text-gray-500 max-w-md mx-auto">
      Drag the sliders to estimate what missed calls cost you each month.
     </p>
    </div>

    <div className="bg-white border border-gray-200 rounded-3xl sm:rounded-[32px] p-6 sm:p-8 md:p-12 grid md:grid-cols-2 gap-8 md:gap-14 items-center">
     <div className="space-y-7">
      <Slider
       label="Missed calls per day"
       value={missedPerDay}
       min={1} max={20} step={1}
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
        min={100} max={10000} step={50}
        value={Math.min(avgJobValue, 10000)}
        onChange={(e) => setAvgJobValue(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-sky-500
         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
         [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
         [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,1),0_0_0_5px_rgba(229,231,235,1)]"
       />
      </div>
      <Slider
       label="Booking rate on answered calls"
       value={closeRate}
       min={10} max={70} step={5}
       display={`${closeRate}%`}
       onChange={setCloseRate}
      />
     </div>

     <div className="text-left">
      <div className="text-sm text-gray-500 mb-2">You&apos;re losing about</div>
      <div className="font-display text-5xl md:text-6xl font-medium tracking-tight text-gray-900 mb-1 tabular-nums">
       {fmt(lostMonth)}
      </div>
      <div className="text-sm text-gray-500 mb-7">in revenue every month.</div>

      <div className="border-t border-gray-200 pt-5">
       <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-gray-700 font-medium">CloudGreet recovers about</span>
        <span className="font-display text-2xl md:text-3xl font-medium text-sky-600 tabular-nums">
         {fmt(recoveredMonth)}
        </span>
       </div>
       <div className="text-xs text-gray-500 mt-1">per month, based on a 70% recovery rate</div>
      </div>

      <Link
       href="/contact"
       className="mt-7 inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors w-full justify-center"
      >
       Book a Demo
       <ArrowUpRight />
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
    min={min} max={max} step={step} value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-sky-500
     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
     [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
     [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,1),0_0_0_5px_rgba(229,231,235,1)]"
   />
  </div>
 )
}

/* ----------------------------- Footer --------------------------- */

function Footer() {
 return (
  <footer className="px-5 sm:px-6 py-8 border-t border-black/5">
   <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
    <div className="flex items-center gap-3">
     <span>© {new Date().getFullYear()} CloudGreet</span>
     <span className="w-px h-3 bg-gray-300" />
     <span>Austin, TX</span>
    </div>
    <div className="flex items-center gap-5">
     <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
     <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
     <Link href="/tcpa-a2p" className="hover:text-gray-900 transition-colors">TCPA</Link>
     <a href={DEMO_TEL} className="hover:text-gray-900 transition-colors">{DEMO_NUMBER}</a>
    </div>
   </div>
  </footer>
 )
}

/* ---------------------------- Inline icons ---------------------- */
/**
 * Small, deliberate inline SVGs. The default lucide-react set looked
 * generic ("default-looking icons and emojis"). These are simpler,
 * sharper, and consistent with the type weight on this page.
 */
function ArrowRight({ className = '' }: { className?: string }) {
 return (
  <svg viewBox="0 0 16 16" className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
   <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
 )
}

function ArrowUpRight({ className = '' }: { className?: string }) {
 return (
  <svg viewBox="0 0 16 16" className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
   <path d="M5 11L11 5M6 5h5v5" />
  </svg>
 )
}
