"use client"

import React, { Suspense } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, ArrowRight, Shield, Calendar, Zap
} from 'lucide-react'
import Link from 'next/link'
import SilkRibbon from './SilkRibbon'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-black to-slate-900">

      {/* Vignette overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center min-h-screen flex flex-col items-center justify-center pt-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-purple-300 leading-tight tracking-tight">
            Never Miss a Call Again
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            CloudGreet answers, qualifies, and books jobs so you don't lose revenue.
            <br />
            <span className="text-blue-400 font-semibold">Simple pricing: $200/mo + $50 per booking</span>
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex justify-center items-center mb-12"
        >
          <Link
            href="/start"
            className="inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-2xl transform hover:scale-105"
          >
            <Zap className="w-6 h-6 mr-3" />
            Test for Free
          </Link>
        </motion.div>

        {/* Animated Background Lines - Full Screen */}
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <SilkRibbon 
            className="absolute inset-0 w-full h-full"
            speed={1.2}
            amplitude={3.0}
            colorA="#6AA7FF"
            colorB="#A06BFF"
          />
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative z-10 flex flex-wrap justify-center items-center gap-8 text-gray-400 py-8"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span>Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            <span>Telynyx</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span>Google Calendar</span>
          </div>
        </motion.div>

      </div>
    </section>
  )
}