"use client"

import React, { Suspense, memo } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, ArrowRight, Shield, Calendar, Zap
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/app/components/ui/Button'

// WAVE BACKGROUND - Original canvas-based purple waves with magnetic field effects
// Use dynamic import to prevent hydration issues
const WaveBackground = dynamic(() => import('./WaveBackground.jsx'), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-black to-slate-900" />
})

const Hero = memo(function Hero() {

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-black to-slate-900">

      {/* Vignette overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />

      {/* Premium Background Effects - Using Design System Colors */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15)_0%,transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,197,94,0.1)_0%,transparent_50%)]"></div>
      

          {/* WAVE BACKGROUND - Original canvas-based purple waves with magnetic field effects */}
          <WaveBackground intensity={1.0} />
      
      {/* Additional glow overlay for premium effect - Using Design Tokens */}
      <div className="absolute inset-0 bg-gradient-to-r from-secondary-500/3 via-primary-500/6 to-secondary-500/3 pointer-events-none z-1"></div>

      {/* Content */}
      <div className="relative z-50 max-w-6xl mx-auto px-4 text-center min-h-screen flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-secondary-200 to-primary-300 leading-tight tracking-tight">
            Never Miss a Call Again
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            CloudGreet answers, qualifies, and books jobs so you don&apos;t lose revenue.
            <br />
            <span className="text-secondary-400 font-semibold">Simple pricing: $200/mo + $50 per booking</span>
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex justify-center items-center mb-12 mt-6 relative z-50"
        >
          <Button
            asChild
            variant="default"
            size="lg"
            icon={<Zap className="w-5 h-5" />}
            iconPosition="left"
            data-cta-button
            className="bg-primary-500 hover:bg-primary-600 text-white shadow-glow border-primary-500 hover:border-primary-400"
            aria-label="Get started with CloudGreet for free"
          >
            <Link href="/start">
              Get Started Free
            </Link>
          </Button>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative z-30 flex flex-wrap justify-center items-center gap-4 md:gap-6 text-gray-300 py-6 px-4"
        >
          <div className="flex items-center gap-3 px-4 py-2 min-h-[44px] bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-all duration-normal">
            <Shield className="w-5 h-5 text-secondary-400" aria-hidden="true" />
            <span className="font-medium">Stripe</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 min-h-[44px] bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-all duration-normal">
            <Phone className="w-5 h-5 text-primary-400" aria-hidden="true" />
            <span className="font-medium">Telnyx</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 min-h-[44px] bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-all duration-normal">
            <Calendar className="w-5 h-5 text-success-400" aria-hidden="true" />
            <span className="font-medium">Google Calendar</span>
          </div>
        </motion.div>

      </div>
    </section>
  )
})

Hero.displayName = 'Hero'

export default Hero
