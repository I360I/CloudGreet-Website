"use client"

import React, { Suspense } from 'react'
import { motion } from 'framer-motion'
import { 
 Phone, ArrowRight, Shield, Calendar, Zap
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// WAVE BACKGROUND - Original canvas-based purple waves with magnetic field effects
// Use dynamic import to prevent hydration issues
const WaveBackground = dynamic(() => import('./WaveBackground.jsx'), { 
 ssr: false,
 loading: () => <div className="absolute inset-0 bg-slate-900" />
})

export default function Hero() {

 return (
 <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900">

 {/* Vignette overlay for better text readability */}
 <div className="absolute inset-0 bg-black/20 pointer-events-none" />

 {/* Premium Background Effects */}
 

 {/* WAVE BACKGROUND - Original canvas-based purple waves with magnetic field effects */}
 <WaveBackground intensity={1.0} />
 
 {/* Additional glow overlay for premium effect */}
 <div className="absolute inset-0 bg-blue-500/3 pointer-events-none z-1"></div>

 {/* Content */}
 <div className="relative z-50 max-w-6xl mx-auto px-4 text-center min-h-screen flex flex-col items-center justify-center">
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.8 }}
 className="mb-6"
 >
 <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 from-white leading-tight tracking-tight">
 Never Miss a Call Again
 </h1>
 <p className="text-base md:text-lg text-gray-300 max-w-4xl mx-auto leading-snug">
 CloudGreet answers, qualifies, and books jobs so you don&apos;t lose revenue.
 <br />
 <span className="text-sky-400 font-semibold">Plans from $499/mo &mdash; flat pricing, no per-booking fees</span>
 </p>
 </motion.div>

 {/* CTA Buttons */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3, duration: 0.8 }}
 className="flex justify-center items-center mb-12 mt-6 relative z-50"
 >
 <Link
 href="/start"
 data-cta-button
 className="inline-flex items-center justify-center gap-2 bg-white/15 backdrop-blur-xl text-white px-4 py-2 rounded-lg text-sm font-semibold border border-white/30 hover:bg-white/25 hover:border-white/50 transition-all duration-300 shadow-lg transform hover:scale-105"
 >
 <Zap className="w-4 h-4" />
 Get Started Free
 </Link>
 </motion.div>

 {/* Trust Badges */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.6, duration: 0.8 }}
 className="relative z-30 flex flex-wrap justify-center items-center gap-4 md:gap-6 text-gray-300 py-6 px-4"
 >
 <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
 <Shield className="w-5 h-5 text-blue-400" />
 <span className="font-medium">Stripe</span>
 </div>
 <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
 <Phone className="w-5 h-5 text-sky-400" />
 <span className="font-medium">Telnyx</span>
 </div>
 <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
 <Calendar className="w-5 h-5 text-green-400" />
 <span className="font-medium">Google Calendar</span>
 </div>
 </motion.div>

 </div>
 </section>
 )
}
