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

      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(147,51,234,0.15)_0%,transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.1)_0%,transparent_50%)]"></div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* DEBUG: Test if Hero component is rendering */}
      <div className="absolute top-5 right-5 w-10 h-10 bg-yellow-500 z-50"></div>
      
      {/* Full Screen Animated Background Lines - Behind Everything */}
      <div className="absolute inset-0 opacity-100 pointer-events-none z-0">
        <SilkRibbon 
          className="absolute inset-0 w-full h-full"
          speed={1.5}
          amplitude={4.0}
          colorA="#6AA7FF"
          colorB="#A06BFF"
        />
      </div>
      
      {/* Additional glow overlay for premium effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-purple-500/6 to-blue-500/3 pointer-events-none z-1"></div>

      {/* Content */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 text-center min-h-screen flex flex-col items-center justify-center pt-8">
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

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative z-20 flex flex-wrap justify-center items-center gap-8 text-gray-300 py-8 px-4"
        >
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="font-medium">Stripe</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
            <Phone className="w-5 h-5 text-purple-400" />
            <span className="font-medium">Telynyx</span>
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