"use client"

import React, { Suspense } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, ArrowRight, Shield, Calendar, Zap, Sparkles, Star
} from 'lucide-react'
import Link from 'next/link'

// PREMIUM WAVE BACKGROUND - Electric purple energy waves
import WaveBackground from './WaveBackground'

export default function Hero() {

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-black to-slate-900">

      {/* Premium vignette overlay for perfect text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 pointer-events-none z-10" />

      {/* PREMIUM WAVE BACKGROUND - Electric Purple Energy Waves */}
      <WaveBackground 
        intensity={1.0}
        className="z-0"
      />
      
      {/* Electric atmospheric glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/3 via-blue-500/6 to-purple-500/3 pointer-events-none z-1"></div>
      
      {/* Floating particles for extra premium feel */}
      <div className="absolute inset-0 pointer-events-none z-5">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-50 max-w-6xl mx-auto px-4 text-center min-h-screen flex flex-col items-center justify-center py-16" style={{ zIndex: 50 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          {/* Premium badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-full border border-purple-400/30 mb-6"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">AI-Powered Receptionist</span>
          </motion.div>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-blue-300 leading-loose tracking-tight py-4">
            Never Miss a Call Again
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 max-w-4xl mx-auto leading-relaxed mb-4">
            CloudGreet answers, qualifies, and books jobs so you don't lose revenue.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl border border-purple-400/20"
          >
            <Star className="w-5 h-5 text-yellow-400" />
            <span className="text-lg font-semibold text-purple-300">Simple pricing: $200/mo + $50 per booking</span>
          </motion.div>
        </motion.div>

            {/* Clean CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex justify-center items-center mb-16 mt-8 relative z-50"
            >
              <Link
                href="/start"
                data-cta-button
                className="group relative inline-flex items-center"
              >
                {/* Main button */}
                <div className="relative bg-black/80 backdrop-blur-xl border border-white/20 rounded-full px-8 py-4 text-white font-semibold text-lg hover:bg-black/90 hover:border-white/30 transition-all duration-300 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Get Started Free</span>
                    <motion.div
                      className="w-5 h-5"
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Zap className="w-5 h-5 text-yellow-400" />
                    </motion.div>
                  </div>
                  
                  {/* Hover effect - sliding background */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />
                </div>
              </Link>
            </motion.div>

        {/* Premium Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="relative z-30 flex flex-wrap justify-center items-center gap-6 text-gray-200 py-8 px-4"
        >
          <motion.div 
            className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl border border-blue-400/20 hover:border-blue-400/40 hover:bg-blue-500/20 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
            <span className="font-semibold">Stripe</span>
          </motion.div>
          
          <motion.div 
            className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl border border-purple-400/20 hover:border-purple-400/40 hover:bg-purple-500/20 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Phone className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors duration-300" />
            <span className="font-semibold">Telynyx</span>
          </motion.div>
          
          <motion.div 
            className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl border border-green-400/20 hover:border-green-400/40 hover:bg-green-500/20 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Calendar className="w-5 h-5 text-green-400 group-hover:text-green-300 transition-colors duration-300" />
            <span className="font-semibold">Google Calendar</span>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}