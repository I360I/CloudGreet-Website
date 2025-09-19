'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Phone, Play, CheckCircle, Calendar, Zap, 
  TrendingUp, Users, DollarSign
} from 'lucide-react'
import RoiCalculator from '../components/RoiCalculator'
import Hero from '../components/Hero'
import SilkRibbon from '../components/SilkRibbon'

export default function LandingPageNew() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="border-b border-gray-800/50 backdrop-blur-md bg-black/20 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              CloudGreet
            </Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link>
              <Link href="/help" className="text-gray-300 hover:text-white transition-colors">Help</Link>
              <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">Contact</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-300 hover:text-white transition-colors">Login</Link>
              <Link href="/start" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
                Test for Free
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-8">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Receptionist
              </span>
              <br />
              <span className="text-white">That Never Sleeps</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform every call into a booking. CloudGreet's AI receptionist answers, qualifies, 
              and schedules appointments 24/7 - turning missed calls into revenue.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Link
                href="/start"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-6 rounded-2xl text-2xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-blue-500/25 flex items-center justify-center gap-4"
              >
                <Zap className="w-8 h-8" />
                Test for Free
              </Link>
              
              <button className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors group">
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                  <Play className="w-5 h-5 ml-1" />
                </div>
                <span className="text-lg">See How It Works</span>
              </button>
            </div>
            
            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {[
                '24/7 AI Receptionist',
                'Instant Lead Qualification', 
                'Automatic Appointment Booking',
                'Real-time Dashboard',
                'SMS Follow-ups',
                'Revenue Tracking'
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-200 text-lg">{feature}</span>
                </motion.div>
              ))}
            </div>
            
            {/* CTA Button */}
            <Link
              href="/start"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-5 rounded-2xl text-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-blue-500/25 inline-block"
            >
              <div className="flex items-center justify-center gap-3">
                <Zap className="w-6 h-6" />
                Test for Free
              </div>
            </Link>
            
            {/* Professional messaging for exclusive feel */}
            <p className="text-gray-400 text-sm mt-6">
              No credit card required • Setup in minutes • Professional AI receptionist
            </p>
          </motion.div>
        </div>
      </section>

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
  )
}
