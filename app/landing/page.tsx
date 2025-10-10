"use client"

import React, { Suspense } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { 
  Phone, Play, CheckCircle, Calendar, Zap, 
  TrendingUp, Users, DollarSign
} from 'lucide-react'
import Hero from '../components/Hero'
import SilkRibbon from '../components/SilkRibbon'

// Dynamic import to prevent SSR issues with Three.js
const VoiceHelixOrb = dynamic(() => import('../components/VoiceHelixOrb'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] md:h-[500px] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4 animate-spin" />
        <p className="text-gray-400">Loading 3D experience...</p>
      </div>
    </div>
  )
})

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white" style={{color: 'white'}}>
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="border-b border-gray-800/50 backdrop-blur-md bg-black/20 sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/landing" className="flex items-center hover:opacity-80 transition-opacity cursor-pointer relative z-10">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center"
              >
                <span className="text-2xl font-bold text-white" style={{color: 'white'}}>CloudGreet</span>
              </motion.div>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <motion.a 
                whileHover={{ y: -2 }}
                href="#how-it-works" 
                className="text-gray-300 hover:text-white transition-colors duration-300 font-medium"
                aria-label="Learn how CloudGreet works"
              >
                How it Works
              </motion.a>
              <motion.a 
                whileHover={{ y: -2 }}
                href="#pricing" 
                className="text-gray-300 hover:text-white transition-colors duration-300 font-medium"
                aria-label="View CloudGreet pricing"
              >
                Pricing
              </motion.a>
              <motion.a 
                whileHover={{ y: -2 }}
                href="#roi-calculator" 
                className="text-gray-300 hover:text-white transition-colors duration-300 font-medium"
                aria-label="See value proposition"
              >
                Value Proposition
              </motion.a>
            </div>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="/login"
              className="bg-white/15 backdrop-blur-xl text-white px-8 py-3 rounded-xl font-semibold border border-white/30 hover:bg-white/25 hover:border-white/50 transition-all duration-300 shadow-2xl"
              aria-label="Sign in to your CloudGreet account"
            >
              Sign In
            </motion.a>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section with 3D Ribbon */}
      <Hero />

      {/* Interactive Voice Demo */}
      <section className="py-24 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1)_0%,transparent_50%)]" />
        <div className="absolute top-1/4 left-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-white">
              Try It Right Now
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Click the helix orb to speak with our AI receptionist. Watch the strands pulse with the AI's voice.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 overflow-hidden">
              <VoiceHelixOrb businessName="CloudGreet" isDemo={true} />
            </div>
          </motion.div>

          {/* Benefits Below Demo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 grid md:grid-cols-3 gap-6 text-center"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">🎤</div>
              <h4 className="font-semibold mb-2">Natural Speech</h4>
              <p className="text-sm text-gray-400">Talk naturally, like calling a real receptionist</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">🧠</div>
              <h4 className="font-semibold mb-2">Understands Context</h4>
              <p className="text-sm text-gray-400">AI remembers and adapts to the conversation</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">📅</div>
              <h4 className="font-semibold mb-2">Books Instantly</h4>
              <p className="text-sm text-gray-400">Can schedule appointments during the call</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Value Proposition */}
      <section id="roi-calculator" className="py-24 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-6xl md:text-7xl font-bold mb-6 text-white from-white via-blue-200 to-purple-300">
              Stop Losing Revenue
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Every missed call is a lost customer. CloudGreet ensures you never miss an opportunity.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 text-center">
              <div className="text-5xl font-bold text-red-400 mb-4">30%</div>
              <p className="text-gray-300">Of calls go to voicemail during business hours</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 text-center">
              <div className="text-5xl font-bold text-yellow-400 mb-4">85%</div>
              <p className="text-gray-300">Of callers won't leave a message</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 text-center">
              <div className="text-5xl font-bold text-green-400 mb-4">$500+</div>
              <p className="text-gray-300">Average value of a booked job</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-6xl md:text-7xl font-bold mb-6 text-white from-white via-blue-200 to-purple-300">
              How CloudGreet Works
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Three simple steps to transform your business communication
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-white/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative bg-gray-800/40 backdrop-blur-xl p-10 rounded-3xl border border-gray-700/50 text-center shadow-2xl group-hover:border-blue-500/30 transition-all duration-500">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center mx-auto text-4xl font-bold shadow-lg group-hover:shadow-blue-500/25 transition-all duration-500">
                    1
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-6 text-white from-blue-400 to-purple-400">
                  AI Answers in &lt;1 Ring
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  Our AI receptionist picks up every call instantly, ensuring no customer is left waiting or hanging up.
                </p>
                <div className="mt-6 flex justify-center">
                  <div className="w-12 h-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full" />
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-white/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative bg-gray-800/40 backdrop-blur-xl p-10 rounded-3xl border border-gray-700/50 text-center shadow-2xl group-hover:border-purple-500/30 transition-all duration-500">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center mx-auto text-4xl font-bold shadow-lg group-hover:shadow-purple-500/25 transition-all duration-500">
                    2
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-6 text-white from-purple-400 to-pink-400">
                  Qualifies Leads
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  The AI gathers all necessary details: service needed, location, urgency, and budget automatically.
                </p>
                <div className="mt-6 flex justify-center">
                  <div className="w-12 h-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full" />
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-white/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative bg-gray-800/40 backdrop-blur-xl p-10 rounded-3xl border border-gray-700/50 text-center shadow-2xl group-hover:border-pink-500/30 transition-all duration-500">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center mx-auto text-4xl font-bold shadow-lg group-hover:shadow-pink-500/25 transition-all duration-500">
                    3
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-6 text-white from-pink-400 to-red-400">
                  Books Appointments
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  Seamlessly schedules qualified leads directly into your calendar and sends SMS confirmations.
                </p>
                <div className="mt-6 flex justify-center">
                  <div className="w-12 h-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full" />
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Connection Lines */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent z-0" style={{ transform: 'translateY(-50%)' }} />
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-24 bg-gradient-to-br from-gray-900/50 via-black/50 to-gray-900/50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-6xl md:text-7xl font-bold mb-6 text-white from-white via-blue-200 to-purple-300">
              Professional Dashboard
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Real-time insights and analytics to track your business growth
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            {/* Dashboard Container */}
            <div className="bg-gray-800/20 backdrop-blur-2xl p-8 lg:p-12 rounded-3xl border border-gray-700/30 shadow-2xl">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="ml-4 text-gray-400 text-sm">CloudGreet Dashboard</span>
                </div>
                <div className="text-sm text-gray-400">
                  Last updated: Just now
                </div>
              </div>
              
              {/* KPI Cards Grid - Feature Showcase */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
                  <div className="relative bg-gradient-to-br from-blue-600/10 to-purple-600/10 p-8 rounded-2xl border border-blue-500/20 backdrop-blur-sm group-hover:border-blue-400/40 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center shadow-lg">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"
                      >
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-gray-200">24/7 Coverage</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold text-blue-400">100%</p>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">Never miss a call</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
                  <div className="relative bg-gradient-to-br from-green-600/10 to-emerald-600/10 p-8 rounded-2xl border border-green-500/20 backdrop-blur-sm group-hover:border-green-400/40 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                        className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"
                      >
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-gray-200">Auto-Booking</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold text-green-400">Instant</p>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">Appointments scheduled</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
                  <div className="relative bg-gradient-to-br from-purple-600/10 to-pink-600/10 p-8 rounded-2xl border border-purple-500/20 backdrop-blur-sm group-hover:border-purple-400/40 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center shadow-lg">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                        className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"
                      >
                        <Zap className="w-5 h-5 text-purple-400" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-gray-200">Smart AI</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold text-purple-400">GPT-4</p>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">Powered intelligence</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
                  <div className="relative bg-gradient-to-br from-yellow-600/10 to-orange-600/10 p-8 rounded-2xl border border-yellow-500/20 backdrop-blur-sm group-hover:border-yellow-400/40 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                        className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"
                      >
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-gray-200">ROI Tracking</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold text-yellow-400">Real-time</p>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">Revenue insights</p>
                  </div>
                </motion.div>
              </div>
              
              {/* Dashboard Description */}
              <div className="text-center">
                <p className="text-gray-300 text-lg leading-relaxed max-w-4xl mx-auto">
                  Real-time analytics, call recordings, and performance insights to help you grow your business. 
                  Track every metric that matters and make data-driven decisions.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-br from-gray-900/50 via-black/50 to-gray-900/50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <h2 className="text-6xl md:text-7xl font-bold mb-6 text-white from-white via-blue-200 to-purple-300">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              One plan, everything included. No hidden fees, no surprises, no confusion.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative max-w-2xl mx-auto"
          >
            {/* Pricing Card */}
            <div className="relative group">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500" />
              
              {/* Card */}
              <div className="relative bg-gray-800/30 backdrop-blur-2xl p-12 rounded-3xl border border-gray-700/50 shadow-2xl group-hover:border-blue-500/30 transition-all duration-500">
                {/* Only Plan Badge */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                    Only Plan
                  </div>
                </div>
                
                {/* Plan Title */}
                <h3 className="text-4xl font-bold mb-6 text-white from-blue-400 to-purple-400">
                  Complete Solution
                </h3>
                
                {/* Pricing */}
                <div className="mb-8">
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-6xl font-bold text-white from-blue-400 to-purple-400">
                      $200
                    </span>
                    <span className="text-xl text-gray-400">/mo</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2 mb-4">
                    <span className="text-2xl text-gray-300">+</span>
                    <span className="text-4xl font-bold text-white from-green-400 to-emerald-400">
                      $50
                    </span>
                    <span className="text-lg text-gray-400">per booking</span>
                  </div>
                </div>
                
                {/* Features List */}
                <div className="space-y-4 mb-10">
                  {[
                    "24/7 AI Call Answering",
                    "Intelligent Lead Qualification", 
                    "Calendar Booking & SMS Confirmations",
                    "Missed-Call Recovery Texts",
                    "Call Recordings & Transcripts",
                    "Professional Dashboard & ROI Tracking",
                    "Custom Business Greeting",
                    "Integration with Google/Microsoft Calendar"
                  ].map((feature, index) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="flex items-center gap-4 text-left"
                    >
                      <div className="w-6 h-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-200 text-lg">{feature}</span>
                    </motion.div>
                  ))}
                </div>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Link
                    href="/demo"
                    className="flex-1 bg-white/15 backdrop-blur-xl text-white px-8 py-4 rounded-2xl text-lg font-semibold border border-white/30 hover:bg-white/25 hover:border-white/50 transition-all duration-300 shadow-2xl inline-block focus:ring-4 focus:ring-blue-500/50 focus:outline-none"
                    aria-label="Try CloudGreet demo"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Play className="w-5 h-5" aria-hidden="true" />
                      Try Demo
                    </div>
                  </Link>
                  <Link
                    href="/register-simple"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 shadow-2xl inline-block focus:ring-4 focus:ring-purple-500/50 focus:outline-none"
                    aria-label="Create your CloudGreet account"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Zap className="w-5 h-5" aria-hidden="true" />
                      Get Started Now
                    </div>
                  </Link>
                </div>
                
                {/* Professional messaging for exclusive feel */}
                <p className="text-gray-400 text-sm mt-6">
                  No credit card required • Setup in minutes • Professional AI receptionist
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* Final CTA Banner */}
      <section className="py-24 bg-gradient-to-r from-blue-600/10 via-purple-600/15 to-blue-600/10 border-y border-gray-800/50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h2 className="text-6xl md:text-7xl font-bold mb-6 text-white from-white via-blue-200 to-purple-300">
              Turn missed calls into revenue.
            </h2>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-2xl text-gray-300 mb-16 max-w-4xl mx-auto leading-relaxed"
          >
            Join service businesses who never miss another opportunity. 
            <span className="text-blue-400 font-semibold"> Start growing today.</span>
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex justify-center items-center"
          >
            <Link
              href="/start"
              className="bg-white/15 backdrop-blur-xl text-white px-12 py-6 rounded-2xl text-2xl font-semibold border border-white/30 hover:bg-white/25 hover:border-white/50 transition-all duration-300 shadow-2xl flex items-center justify-center gap-4 inline-block"
            >
              <Zap className="w-8 h-8" />
              Test for Free
            </Link>
            
          </motion.div>
          
          {/* Trust Indicators with Animated Background */}
          <div className="relative mt-16">
            {/* Animated Background Lines */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <SilkRibbon
                className="absolute inset-x-0 top-0 h-full"
                speed={1.5}
                amplitude={0.8}
                colorA="#A06BFF"
                colorB="#6AA7FF"
              />
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="relative z-10 flex flex-wrap justify-center items-center gap-8 text-gray-400"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Stripe Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Telynyx Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Google Calendar</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900/80 via-black/80 to-gray-900/80 py-16 border-t border-gray-800/50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-transparent to-purple-500/3" />
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          {/* Footer Content */}
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center mb-6">
                <span className="text-3xl font-bold text-white from-white to-blue-200">CloudGreet</span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed max-w-md mb-4">
                Never miss a call again. Transform missed opportunities into booked appointments with AI-powered call handling.
              </p>
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-medium">Business Phone:</span> +1 (737) 244-8305
                </p>
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-medium">Email:</span> support@cloudgreet.com
                </p>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold text-lg mb-6">Quick Links</h4>
              <div className="space-y-3">
                <a href="#how-it-works" className="block text-gray-400 hover:text-white transition-colors duration-300">How it Works</a>
                <a href="#pricing" className="block text-gray-400 hover:text-white transition-colors duration-300">Pricing</a>
                <a href="#roi-calculator" className="block text-gray-400 hover:text-white transition-colors duration-300">ROI Calculator</a>
              </div>
            </div>
            
            {/* Support */}
            <div>
              <h4 className="text-white font-semibold text-lg mb-6">Support</h4>
              <div className="space-y-3">
                <a href="/contact" className="block text-gray-400 hover:text-white transition-colors duration-300">Contact Us</a>
                <a href="/help" className="block text-gray-400 hover:text-white transition-colors duration-300">Help Center</a>
                <a href="tel:+17372448305" className="block text-gray-400 hover:text-white transition-colors duration-300">Call: +1 (737) 244-8305</a>
                <a href="mailto:support@cloudgreet.com" className="block text-gray-400 hover:text-white transition-colors duration-300">Email Support</a>
              </div>
            </div>
          </div>
          
          {/* Legal Links */}
          <div className="border-t border-gray-800/50 pt-8 mb-8">
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm">
              <a href="/terms" className="text-gray-400 hover:text-white transition-colors duration-300">Terms of Service</a>
              <a href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-300">Privacy Policy</a>
              <a href="/tcpa-a2p" className="text-gray-400 hover:text-white transition-colors duration-300">TCPA/A2P Policy</a>
              <a href="/cookies" className="text-gray-400 hover:text-white transition-colors duration-300">Cookie Policy</a>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-4">
              &copy; {new Date().getFullYear()} CloudGreet. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Reply STOP to opt out; HELP for help. Message and data rates may apply.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}