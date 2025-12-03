"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Phone, Play, CheckCircle, Calendar, Zap, 
  TrendingUp, Users, DollarSign, Settings,
  Mic, Brain, CalendarCheck
} from 'lucide-react'
import Hero from '@/app/components/Hero'
import { logger } from '@/lib/monitoring'
import SilkRibbon from '@/app/components/SilkRibbon'
import RingOrb from '@/app/components/RingOrb'
import CallOrb from '@/app/components/CallOrb'
import Footer from '@/app/components/Footer'
import { useToast } from '@/app/contexts/ToastContext'
import SkeletonLoader from '@/app/components/ui/SkeletonLoader'
import { Button } from '@/app/components/ui/Button'
import PhoneInput from '@/app/components/ui/PhoneInput'
// import ROICalculator from '@/app/components/ROICalculator'

function VoiceOrbDemoWithSettings() {
  const [businessInfo, setBusinessInfo] = React.useState({
    name: 'CloudGreet',
    type: 'AI Receptionist Service',
    services: 'AI phone answering, appointment scheduling, 24/7 support',
    hours: '24/7'
  })
  const [showForm, setShowForm] = React.useState(false)

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 md:p-6">
      {/* Business Info Form */}
      <motion.div className="mb-6">
        <Button
          onClick={() => setShowForm(!showForm)}
          variant="ghost"
          size="sm"
          icon={<Settings className="w-4 h-4" />}
          iconPosition="left"
          className="text-sm text-purple-400 hover:text-purple-300 mb-3"
          aria-label={showForm ? 'Hide business info customization form' : 'Show business info customization form'}
          aria-expanded={showForm}
        >
          {showForm ? 'Hide' : 'Customize'} Business Info
        </Button>
        
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-black/30 rounded-xl"
          >
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Business Name</label>
              <input
                type="text"
                value={businessInfo.name}
                onChange={(e) => setBusinessInfo({...businessInfo, name: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Business Type</label>
              <input
                type="text"
                value={businessInfo.type}
                onChange={(e) => setBusinessInfo({...businessInfo, type: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Services</label>
              <input
                type="text"
                value={businessInfo.services}
                onChange={(e) => setBusinessInfo({...businessInfo, services: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Hours</label>
              <input
                type="text"
                value={businessInfo.hours}
                onChange={(e) => setBusinessInfo({...businessInfo, hours: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </motion.div>
        )}
        
        <p className="text-xs text-gray-500 mb-4">
          💡 Real phone call • Experience the same AI that handles your customers
        </p>
      </motion.div>

        <CallOrb 
          onCall={async (phoneNumber) => {
            const response = await fetch('/api/telnyx/initiate-call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phoneNumber, businessId: null, businessInfo })
            })
            if (!response.ok) throw new Error('Call failed')
          }}
        />
    </div>
  )
}

export default function LandingPage() {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [isNavVisible, setIsNavVisible] = React.useState(true)
  const [lastScrollY, setLastScrollY] = React.useState(0)
  const [phoneNumber, setPhoneNumber] = React.useState('')
  const [isPhoneValid, setIsPhoneValid] = React.useState(false)
  const { showSuccess, showError, showInfo } = useToast()

  React.useEffect(() => {
    // Ensure Hero component loads first
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Show nav when scrolling up or at top, hide when scrolling down
      if (currentScrollY < 10) {
        setIsNavVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px
        setIsNavVisible(false)
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsNavVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <SkeletonLoader variant="circular" width={64} height={64} className="mx-auto" />
          <SkeletonLoader variant="text" width={200} height={24} className="mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ 
          opacity: isNavVisible ? 1 : 0,
          y: isNavVisible ? 0 : -100
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`border-b border-gray-800 backdrop-blur-md bg-gray-900/80 sticky top-0 z-sticky transition-all duration-normal ${
          isNavVisible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/landing" className="flex items-center hover:opacity-80 transition-opacity cursor-pointer relative z-10 min-h-[44px]">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center"
              >
                <span className="text-2xl font-bold text-white">CloudGreet</span>
              </motion.div>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <motion.a 
                whileHover={{ y: -2 }}
                href="#how-it-works" 
                className="text-gray-300 hover:text-white transition-colors duration-normal font-medium min-h-[44px] flex items-center"
                aria-label="Learn how CloudGreet works"
              >
                How it Works
              </motion.a>
              <motion.a 
                whileHover={{ y: -2 }}
                href="#pricing" 
                className="text-gray-300 hover:text-white transition-colors duration-normal font-medium min-h-[44px] flex items-center"
                aria-label="View CloudGreet pricing"
              >
                Pricing
              </motion.a>
              <motion.a 
                whileHover={{ y: -2 }}
                href="#roi-calculator" 
                className="text-gray-300 hover:text-white transition-colors duration-normal font-medium min-h-[44px] flex items-center"
                aria-label="See value proposition"
              >
                Value Proposition
              </motion.a>
            </div>
            <Button
              asChild
              variant="outline"
              size="default"
              className="bg-primary-500 hover:bg-primary-600 border-primary-500 hover:border-primary-400 text-white shadow-lg"
              aria-label="Sign in to your CloudGreet account"
            >
              <motion.a
                href="/login"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign In
              </motion.a>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section with 3D Ribbon */}
      <Hero />

      {/* Interactive Voice Demo */}
      <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-slate-900 via-black to-slate-900">
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white leading-tight">
              Try It Right Now
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Click the orb to call our AI receptionist. Experience real voice AI powered by your actual phone system.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl mx-auto flex flex-col items-center"
          >
            {/* Ring-like Demo with Phone Input */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 md:p-8 text-center shadow-xl">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-white leading-tight">
                Experience the Power of AI
              </h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto text-base md:text-lg">
                Enter your phone number and click the orb to call our AI receptionist
              </p>
              
              {/* Phone Number Input */}
              <div className="max-w-md mx-auto mb-8">
                <PhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  onValidChange={setIsPhoneValid}
                  label="Enter your phone number to test our AI"
                  placeholder="(555) 123-4567"
                  required
                  id="phoneInput"
                  name="phone"
                />
              </div>
              
              {/* Ring-like Orb - THE CALL BUTTON - Matches hero animation */}
              <div className="flex justify-center mb-8 relative z-10">
                <RingOrb
                  size={320}
                  isClickable={true}
                  onClick={async () => {
                    // Validate phone number before proceeding
                    if (!phoneNumber || !isPhoneValid) {
                      showError('Phone Number Required', 'Please enter a valid 10-digit phone number first.')
                      return
                    }

                    // Format phone number (remove all non-digits)
                    const formattedNumber = phoneNumber.replace(/\D/g, '')
                    
                    try {
                      showInfo('Initiating call...', 'You should receive a call in 5-10 seconds.')
                      
                      // Make REAL API call to initiate test call
                      const response = await fetch('/api/telnyx/initiate-call', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          phoneNumber: `+1${formattedNumber}`,
                          businessId: null
                        })
                      })
                      
                      const result = await response.json()
                      
                      if (!response.ok || !result.success) {
                        const errorMessage = result.message || result.error || 'Failed to initiate call. Please try again.'
                        showError('Call Failed', errorMessage)
                        logger.error('Failed to initiate call from landing page', {
                          error: errorMessage,
                          phoneNumber: formattedNumber,
                          status: response.status
                        })
                      } else {
                        showSuccess('Call Initiated!', 'Answer your phone to talk with our AI receptionist.')
                      }
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate call. Please try again.'
                      showError('Call Failed', errorMessage)
                      logger.error('Error initiating call from landing page', {
                        error: errorMessage,
                        phoneNumber: formattedNumber
                      })
                    }
                  }}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-primary-500/50 transition-all duration-normal">
                  <div className="text-primary-400 font-bold mb-2 text-lg">Real-time Processing</div>
                  <div className="text-gray-300 text-base">AI analyzes speech instantly</div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-secondary-500/50 transition-all duration-normal">
                  <div className="text-secondary-400 font-bold mb-2 text-lg">Neural Networks</div>
                  <div className="text-gray-300 text-base">Advanced machine learning</div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-success-500/50 transition-all duration-normal">
                  <div className="text-success-400 font-bold mb-2 text-lg">24/7 Active</div>
                  <div className="text-gray-300 text-base">Always ready to help</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Benefits Below Demo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 grid md:grid-cols-3 gap-6"
          >
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-normal text-center">
              <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mic className="w-6 h-6 text-primary-400" aria-hidden="true" />
              </div>
              <h4 className="text-lg font-bold mb-3 text-white">Natural Speech</h4>
              <p className="text-base text-gray-300 leading-relaxed">Talk naturally, like calling a real receptionist</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-normal text-center">
              <div className="w-12 h-12 bg-secondary-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-secondary-400" aria-hidden="true" />
              </div>
              <h4 className="text-lg font-bold mb-3 text-white">Understands Context</h4>
              <p className="text-base text-gray-300 leading-relaxed">AI remembers and adapts to the conversation</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-normal text-center">
              <div className="w-12 h-12 bg-success-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CalendarCheck className="w-6 h-6 text-success-400" aria-hidden="true" />
              </div>
              <h4 className="text-lg font-bold mb-3 text-white">Books Instantly</h4>
              <p className="text-base text-gray-300 leading-relaxed">Can schedule appointments during the call</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              Stop Losing Revenue
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
              Every missed call is a lost customer. CloudGreet ensures you never miss an opportunity.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center hover:border-gray-600 transition-all duration-normal shadow-lg">
                <div className="text-5xl font-bold text-white mb-3">30%</div>
                <p className="text-base text-gray-300 leading-relaxed">Of calls go to voicemail during business hours</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center hover:border-gray-600 transition-all duration-normal shadow-lg">
                <div className="text-5xl font-bold text-white mb-3">85%</div>
                <p className="text-base text-gray-300 leading-relaxed">Of callers won&apos;t leave a message</p>
              </div>
              <div className="bg-gray-800 border border-primary-500/50 rounded-xl p-8 text-center hover:border-primary-500 transition-all duration-normal shadow-lg">
                <div className="text-5xl font-bold text-primary-400 mb-3">$500+</div>
                <p className="text-base text-gray-300 leading-relaxed">Average value of a booked job</p>
                <p className="text-sm text-primary-400 font-medium mt-2">You capture with CloudGreet</p>
              </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary-500/5 via-transparent to-primary-500/5" />
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-6 md:mb-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              How CloudGreet Works
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
              Three simple steps to transform your business communication
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-secondary-500/10 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-slow" />
              <div className="relative bg-gray-800 border border-gray-700 p-8 rounded-xl text-center shadow-xl group-hover:border-secondary-500/50 transition-all duration-slow">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-secondary-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <Phone className="w-10 h-10 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div className="inline-block px-3 py-1 bg-secondary-500/10 border border-secondary-500/30 rounded-full text-xs font-semibold text-secondary-400 mb-4">
                  Step 1
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white leading-tight">
                  AI Answers in &lt;1 Ring
                </h3>
                <p className="text-base text-gray-300 leading-relaxed">
                  Our AI receptionist picks up every call instantly, ensuring no customer is left waiting or hanging up.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-primary-500/10 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-slow" />
              <div className="relative bg-gray-800 border border-gray-700 p-8 rounded-xl text-center shadow-xl group-hover:border-primary-500/50 transition-all duration-slow">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle className="w-10 h-10 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div className="inline-block px-3 py-1 bg-primary-500/10 border border-primary-500/30 rounded-full text-xs font-semibold text-primary-400 mb-4">
                  Step 2
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white leading-tight">
                  Qualifies Leads
                </h3>
                <p className="text-base text-gray-300 leading-relaxed">
                  The AI gathers all necessary details: service needed, location, urgency, and budget automatically.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-success-500/10 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-slow" />
              <div className="relative bg-gray-800 border border-gray-700 p-8 rounded-xl text-center shadow-xl group-hover:border-success-500/50 transition-all duration-slow">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-success-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <Calendar className="w-10 h-10 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div className="inline-block px-3 py-1 bg-success-500/10 border border-success-500/30 rounded-full text-xs font-semibold text-success-400 mb-4">
                  Step 3
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white leading-tight">
                  Books Appointments
                </h3>
                <p className="text-base text-gray-300 leading-relaxed">
                  Seamlessly schedules qualified leads directly into your calendar and sends SMS confirmations.
                </p>
              </div>
            </motion.div>
          </div>
          
          {/* Connection Lines */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent z-0" style={{ transform: 'translateY(-50%)' }} />
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-900/50 via-black/50 to-gray-900/50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-500/5 via-transparent to-primary-500/5" />
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-secondary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-6 md:mb-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              Professional Dashboard
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
              Real-time insights and analytics to track your business growth
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            {/* Dashboard Container */}
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-2xl">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Live Dashboard</h3>
                  <p className="text-sm text-gray-400">Real-time business insights</p>
                </div>
              </div>
              
              {/* KPI Cards Grid - Feature Showcase - FIXED: Prevent squishing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary-500/20 to-primary-500/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-slow" />
                  <div className="relative bg-gray-800 border border-gray-700 p-6 rounded-xl group-hover:border-secondary-500/50 transition-all duration-slow shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-secondary-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Phone className="w-6 h-6 text-white" aria-hidden="true" />
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-8 h-8 bg-success-500/20 rounded-lg flex items-center justify-center"
                      >
                        <TrendingUp className="w-5 h-5 text-success-400" aria-hidden="true" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">24/7 Coverage</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-bold text-secondary-400">100%</p>
                    </div>
                    <p className="text-base text-gray-300 mt-2">Never miss a call</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-success-500/20 to-success-600/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-slow" />
                  <div className="relative bg-gray-800 border border-gray-700 p-6 rounded-xl group-hover:border-success-500/50 transition-all duration-slow shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-success-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Calendar className="w-6 h-6 text-white" aria-hidden="true" />
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                        className="w-8 h-8 bg-success-500/20 rounded-lg flex items-center justify-center"
                      >
                        <CheckCircle className="w-5 h-5 text-success-400" aria-hidden="true" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">Auto-Booking</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-bold text-success-400">Instant</p>
                    </div>
                    <p className="text-base text-gray-300 mt-2">Appointments scheduled</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-slow" />
                  <div className="relative bg-gray-800 border border-gray-700 p-6 rounded-xl group-hover:border-primary-500/50 transition-all duration-slow shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Users className="w-6 h-6 text-white" aria-hidden="true" />
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                        className="w-8 h-8 bg-success-500/20 rounded-lg flex items-center justify-center"
                      >
                        <Zap className="w-5 h-5 text-primary-400" aria-hidden="true" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">Smart AI</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-bold text-primary-400">GPT-4</p>
                    </div>
                    <p className="text-base text-gray-300 mt-2">Powered intelligence</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-success-500/20 to-success-600/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-slow" />
                  <div className="relative bg-gray-800 border border-gray-700 p-6 rounded-xl group-hover:border-success-500/50 transition-all duration-slow shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-success-500 rounded-xl flex items-center justify-center shadow-lg">
                        <DollarSign className="w-6 h-6 text-white" aria-hidden="true" />
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                        className="w-8 h-8 bg-success-500/20 rounded-lg flex items-center justify-center"
                      >
                        <TrendingUp className="w-5 h-5 text-success-400" aria-hidden="true" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">ROI Tracking</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-bold text-success-400">Real-time</p>
                    </div>
                    <p className="text-base text-gray-300 mt-2">Revenue insights</p>
                  </div>
                </motion.div>
              </div>
              
              {/* Dashboard Description */}
              <div className="text-center pt-6">
                <p className="text-base text-gray-300 leading-relaxed max-w-3xl mx-auto">
                  Track calls, appointments, and revenue in real-time. Make data-driven decisions with actionable insights.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 bg-gradient-to-br from-gray-900/50 via-black/50 to-gray-900/50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-500/5 via-transparent to-primary-500/5" />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-6 md:mb-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
              One plan, everything included. No hidden fees, no surprises, no confusion.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative max-w-2xl mx-auto"
          >
            {/* Pricing Card */}
            <div className="relative group">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-secondary-500/20 to-primary-500/20 rounded-xl blur-2xl group-hover:blur-3xl transition-all duration-slow" />
              
              {/* Card */}
              <div className="relative bg-gray-800 border-2 border-gray-700 p-8 rounded-xl shadow-2xl group-hover:border-primary-500/50 transition-all duration-slow">
                {/* Only Plan Badge */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                    Only Plan
                  </div>
                </div>
                
                {/* Plan Title */}
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 text-white leading-tight">
                  Complete Solution
                </h3>
                
                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                      $200
                    </span>
                    <span className="text-base md:text-lg text-gray-400">/mo</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2 mb-4">
                    <span className="text-base md:text-lg text-gray-300">+</span>
                    <span className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight">
                      $50
                    </span>
                    <span className="text-sm md:text-base text-gray-400">per booking</span>
                  </div>
                </div>
                
                {/* Features List */}
                <div className="space-y-4 mb-8">
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
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="flex items-center gap-3 text-left"
                    >
                      <div className="w-6 h-6 bg-success-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" aria-hidden="true" />
                      </div>
                      <span className="text-white text-base font-medium">{feature}</span>
                    </motion.div>
                  ))}
                </div>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Button
                    asChild
                    variant="default"
                    size="lg"
                    icon={<Zap className="w-5 h-5" />}
                    iconPosition="left"
                    fullWidth
                    className="bg-primary-500 hover:bg-primary-600 text-white shadow-glow border-primary-500"
                    aria-label="Create your CloudGreet account"
                  >
                    <Link href="/register-simple">
                      Get Started Now
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    icon={<Play className="w-5 h-5" />}
                    iconPosition="left"
                    fullWidth
                    className="bg-gray-900 border-gray-700 hover:bg-gray-800 hover:border-gray-600 text-white shadow-lg"
                    aria-label="Test CloudGreet AI agent"
                  >
                    <Link href="/test-agent-simple">
                      Test AI Agent
                    </Link>
                  </Button>
                </div>
                
                {/* Professional messaging for exclusive feel */}
                <p className="text-gray-400 text-xs md:text-sm mt-4 leading-snug">
                  No credit card required • Setup in minutes • Professional AI receptionist
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* Final CTA Banner */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-secondary-600/10 via-primary-600/15 to-secondary-600/10 border-y border-gray-800 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-500/5 via-transparent to-primary-500/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              Turn missed calls into revenue.
            </h2>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-300 mb-8 max-w-4xl mx-auto leading-snug"
          >
            Join service businesses who never miss another opportunity. 
            <span className="text-blue-400 font-semibold"> Start growing today.</span>
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex justify-center items-center"
          >
            <Button
              asChild
              variant="outline"
              size="default"
              icon={<Zap className="w-4 h-4" />}
              iconPosition="left"
              className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/20 hover:border-white/40 shadow-lg"
              aria-label="Test CloudGreet for free"
            >
              <Link href="/start">
                Test for Free
              </Link>
            </Button>
            
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
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="relative z-10 flex flex-wrap justify-center items-center gap-4 md:gap-6 text-gray-400"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Stripe Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Telnyx Powered</span>
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
      <Footer />
    </div>
  )
}



