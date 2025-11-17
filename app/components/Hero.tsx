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
  loading: () => <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-black to-slate-900" />
})

export default function Hero() {

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-black to-slate-900">

      {/* Vignette overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />

      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(147,51,234,0.15)_0%,transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.1)_0%,transparent_50%)]"></div>
      

          {/* WAVE BACKGROUND - Original canvas-based purple waves with magnetic field effects */}
          <WaveBackground intensity={1.0} />
      
      {/* Additional glow overlay for premium effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-purple-500/6 to-blue-500/3 pointer-events-none z-1"></div>

      {/* Content */}
      <div className="relative z-50 max-w-6xl mx-auto px-4 text-center min-h-screen flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-purple-300 leading-normal tracking-tight pb-2">
            Never Miss a Call Again
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            CloudGreet answers, qualifies, and books jobs so you don&apos;t lose revenue.
            <br />
            <span className="text-blue-400 font-semibold">Simple pricing: $200/mo + $50 per booking</span>
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex justify-center items-center mb-16 mt-8 relative z-50"
        >
          <Link
            href="/start"
            data-cta-button
            className="inline-flex items-center justify-center gap-2 bg-white/15 backdrop-blur-xl text-white px-6 py-3 rounded-lg text-base font-semibold border border-white/30 hover:bg-white/25 hover:border-white/50 transition-all duration-300 shadow-lg transform hover:scale-105"
          >
            <Zap className="w-5 h-5" />
            Get Started Free
          </Link>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative z-30 flex flex-wrap justify-center items-center gap-8 text-gray-300 py-8 px-4"
        >
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="font-medium">Stripe</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
            <Phone className="w-5 h-5 text-purple-400" />
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
