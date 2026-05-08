"use client"

import React, { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Phone, Mail, MapPin, Check } from "lucide-react"

const DEMO_NUMBER = '+1 (737) 937-0084'
const DEMO_TEL = 'tel:+17379370084'
const SUPPORT_EMAIL = 'anthony@cloudgreet.com'
const CAL_LINK = 'cloudgreet'

export default function ContactPage() {
 useEffect(() => {
  // Cal.com inline embed init
  ;(function (C: any, A: string, L: string) {
   const p = (a: any, ar: any) => { a.q.push(ar) }
   const d = C.document
   C.Cal = C.Cal || function () {
    const cal = C.Cal
    const ar = arguments
    if (!cal.loaded) {
     cal.ns = {}
     cal.q = cal.q || []
     d.head.appendChild(d.createElement('script')).src = A
     cal.loaded = true
    }
    if (ar[0] === L) {
     const api: any = function () { p(api, arguments) }
     const namespace = ar[1]
     api.q = api.q || []
     if (typeof namespace === 'string') {
      cal.ns[namespace] = cal.ns[namespace] || api
      p(cal.ns[namespace], ar)
      p(cal, ['initNamespace', namespace])
     } else {
      p(cal, ar)
     }
     return
    }
    p(cal, ar)
   }
  })(window as any, 'https://app.cal.com/embed/embed.js', 'init')
  ;(window as any).Cal('init', { origin: 'https://cal.com' })
  ;(window as any).Cal('inline', {
   elementOrSelector: '#cal-inline',
   calLink: CAL_LINK,
   layout: 'month_view',
  })
  ;(window as any).Cal('ui', {
   theme: 'light',
   styles: { branding: { brandColor: '#0EA5E9' } },
   hideEventTypeDetails: false,
  })
 }, [])

 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   {/* Nav */}
   <nav className="sticky top-0 z-50 bg-[#f6f5f1]/80 backdrop-blur-md border-b border-black/5">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
     <Link href="/" className="flex items-center" aria-label="CloudGreet">
      <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={160} height={48} priority className="h-9 w-auto" />
     </Link>
     <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
      ← Back home
     </Link>
    </div>
   </nav>

   {/* Header */}
   <section className="px-6 pt-20 md:pt-28 pb-10 md:pb-14 text-center">
    <h1 className="font-display font-medium tracking-tight leading-[1.05] text-[40px] md:text-[64px] mb-6 text-gray-900">
     Book a <span className="text-gray-400">15-minute demo.</span>
    </h1>
    <p className="text-base md:text-lg text-gray-500 max-w-md mx-auto">
     Pick a time that works. We&apos;ll send a calendar invite and confirmation email automatically.
    </p>
   </section>

   {/* Cal embed + side panel */}
   <section className="px-6 pb-32">
    <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-6 relative">
     <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />

     {/* Cal embed */}
     <div className="relative md:col-span-3 bg-white border border-gray-200 rounded-[28px] p-3 md:p-4 overflow-hidden">
      <div id="cal-inline" style={{ width: '100%', height: '700px', overflow: 'auto' }} />
     </div>

     {/* Side panel */}
     <div className="relative md:col-span-2 space-y-4">
      <div className="bg-white border border-gray-200 rounded-[28px] p-6 md:p-8">
       <p className="text-sm text-gray-500 mb-2">Want to skip the calendar?</p>
       <p className="font-display text-2xl font-medium text-gray-900 mb-1">Call our AI yourself.</p>
       <p className="text-sm text-gray-500 mb-5">Hear how it sounds &mdash; pretend you&apos;re a customer with an HVAC problem.</p>
       <a
        href={DEMO_TEL}
        className="inline-flex items-center gap-2 bg-white text-gray-900 px-5 py-3 rounded-2xl text-sm font-medium border border-gray-200 hover:border-gray-300 transition-all shadow-[0_0_60px_-10px_rgba(56,189,248,0.45)] w-full justify-center"
       >
        <Phone className="w-4 h-4" />
        {DEMO_NUMBER}
       </a>
      </div>

      <div className="bg-white border border-gray-200 rounded-[28px] p-6 md:p-8">
       <p className="font-display text-lg font-medium text-gray-900 mb-4">What you&apos;ll get on the call:</p>
       <ul className="space-y-3 text-sm text-gray-700">
        <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />A demo of the AI handling a sample call for your business</li>
        <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />Setup walkthrough &mdash; we wire it up for you, no DIY</li>
        <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />A clear ROI breakdown for your specific numbers</li>
       </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-[28px] p-6 md:p-8 space-y-3 text-sm">
       <div className="flex items-center gap-2 text-gray-600">
        <Mail className="w-4 h-4" />
        <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-gray-900">{SUPPORT_EMAIL}</a>
       </div>
       <div className="flex items-center gap-2 text-gray-600">
        <MapPin className="w-4 h-4" />
        <span>Built in Austin, TX</span>
       </div>
      </div>
     </div>
    </div>
   </section>
  </main>
 )
}
