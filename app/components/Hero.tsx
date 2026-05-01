"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { MdPhone, MdPlace, MdVerifiedUser, MdCalendarToday } from "react-icons/md"
import Link from 'next/link'
import dynamic from 'next/dynamic'

const WaveBackground = dynamic(() => import('./WaveBackground.jsx'), {
 ssr: false,
 loading: () => <div className="absolute inset-0 bg-slate-900" />
})

export default function Hero() {
 return (
 <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900">
 <div className="absolute inset-0 bg-black/20 pointer-events-none" />
 <WaveBackground intensity={1.0} />

 <div className="relative z-50 max-w-6xl mx-auto px-4 text-center min-h-screen flex flex-col items-center justify-center">
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.8 }}
 className="mb-6 bg-black/50 backdrop-blur-sm rounded-2xl px-6 md:px-10 py-6 md:py-8"
 >
 <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-5 text-white leading-tight tracking-tight max-w-4xl mx-auto">
 Stop losing profit to voicemail.
 </h1>
 <p className="text-base md:text-lg text-gray-200 max-w-3xl mx-auto leading-relaxed">
 CloudGreet&apos;s AI answers your phone, qualifies the customer, and books the appointment &mdash; even when you&apos;re on a ladder. Built for Texas contractors.
 </p>
 <p className="text-sky-400 font-semibold mt-4">
 Starter $499/mo (after-hours) &middot; Full 24/7 $899/mo &middot; flat pricing, no per-booking fees
 </p>
 </motion.div>

 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3, duration: 0.8 }}
 className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-10 mt-4 relative z-50"
 >
 <Link
 href="/contact"
 data-cta-button
 className="inline-flex items-center justify-center gap-2 bg-sky-500 text-white px-6 py-3 rounded-lg text-sm md:text-base font-semibold hover:bg-sky-400 transition-colors shadow-lg"
 >
 <MdCalendarToday className="w-4 h-4" />
 Book a 15-Minute Demo Call
 </Link>
 <Link
 href="/contact"
 className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg text-sm md:text-base font-semibold border border-white/20 hover:bg-white/20 transition-colors"
 >
 <MdPhone className="w-4 h-4" />
 Hear the AI in action
 </Link>
 </motion.div>

 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.6, duration: 0.8 }}
 className="relative z-30 flex flex-wrap justify-center items-center gap-3 md:gap-4 text-gray-300 py-4 px-4"
 >
 <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
 <MdPlace className="w-4 h-4 text-sky-400" />
 <span className="text-sm font-medium">Built in Austin</span>
 </div>
 <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
 <MdPhone className="w-4 h-4 text-sky-400" />
 <span className="text-sm font-medium">Serving Texas Contractors</span>
 </div>
 <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
 <MdVerifiedUser className="w-4 h-4 text-sky-400" />
 <span className="text-sm font-medium">30-Day Money-Back Guarantee</span>
 </div>
 </motion.div>
 </div>
 </section>
 )
}
