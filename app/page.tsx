"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
 Phone, Play, CheckCircle, Calendar, Zap, 
 TrendingUp, Users, DollarSign, Settings
} from 'lucide-react'
import Hero from '@/app/components/Hero'
import { logger } from '@/lib/monitoring'
import SilkRibbon from '@/app/components/SilkRibbon'
import RingOrb from '@/app/components/RingOrb'
import CallOrb from '@/app/components/CallOrb'
import Footer from '@/app/components/Footer'
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
 <button
 onClick={() => setShowForm(!showForm)}
 className="text-sm text-sky-400 hover:text-sky-300 mb-3 flex items-center gap-2"
 >
 <Settings className="w-4 h-4" />
 {showForm ? 'Hide' : 'Customize'} Business Info
 </button>
 
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
 body: JSON.stringify({ phoneNumber, businessId: 'demo', businessInfo })
 })
 if (!response.ok) throw new Error('Call failed')
 }}
 />
 </div>
 )
}

export const dynamic = "force-dynamic"
export default function LandingPage() {
 const [isLoaded, setIsLoaded] = React.useState(false)
 const [isNavVisible, setIsNavVisible] = React.useState(true)
 const [lastScrollY, setLastScrollY] = React.useState(0)

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
 <div className="min-h-screen via-black flex items-center justify-center">
 <div className="text-center">
 <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
 <p className="text-white text-lg">Loading CloudGreet...</p>
 </div>
 </div>
 )
 }

 return (
 <div className="min-h-screen via-black text-white">
 {/* Navigation */}
 <motion.nav 
 initial={{ opacity: 0, y: -20 }}
 animate={{ 
 opacity: isNavVisible ? 1 : 0,
 y: isNavVisible ? 0 : -100
 }}
 transition={{ duration: 0.3, ease: 'easeInOut' }}
 className={`border-b border-gray-800/50 backdrop-blur-md bg-black/20 sticky top-0 z-50 transition-all duration-300 ${
 isNavVisible ? 'pointer-events-auto' : 'pointer-events-none'
 }`}
 >
 <div className="max-w-6xl mx-auto px-4 py-4">
 <div className="flex items-center justify-between">
 <Link href="/landing" className="flex items-center hover:opacity-80 transition-opacity cursor-pointer relative z-10">
 <motion.div 
 whileHover={{ scale: 1.05 }}
 className="flex items-center"
 >
 <span className="text-2xl font-bold text-white">CloudGreet</span>
 </motion.div>
 </Link>
 <div className="hidden md:flex items-center space-x-6">
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
 className="bg-white/15 backdrop-blur-xl text-white px-5 py-2 rounded-lg text-sm font-medium border border-white/30 hover:bg-white/25 hover:border-white/50 transition-all duration-300 shadow-lg"
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
 <section className="py-12 md:py-16 lg:py-20 relative overflow-hidden via-black ">
 
 <div className="max-w-5xl mx-auto px-4 relative z-10">
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.8 }}
 className="text-center mb-8"
 >
 <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white leading-tight">
 Book a Demo Call
 </h2>
 <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
 Click the orb to call our AI receptionist. Experience real voice AI powered by your actual phone system.
 </p>
 </motion.div>
 
 <motion.div
 initial={{ opacity: 0, scale: 0.9 }}
 whileInView={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.8, delay: 0.2 }}
 className="max-w-4xl mx-auto flex flex-col items-center"
 >
 {/* Ring-like Demo with Phone Input */}
 <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 md:p-6 text-center">
 <h3 className="text-lg md:text-xl lg:text-2xl font-semibold mb-3 bg-sky-400 leading-tight">
 Experience the Power of AI
 </h3>
 <p className="text-gray-300 mb-6 max-w-2xl mx-auto text-sm md:text-base">
 Click the orb to call our AI receptionist
 </p>
 
 {/* Ring-like Orb - THE CALL BUTTON */}
 <div className="flex justify-center mb-6 relative z-10">
 <RingOrb
 size={300}
 isClickable={true}
 onClick={async () => {
 const phoneInput = document.getElementById('phoneInput') as HTMLInputElement;
 const statusDiv = document.getElementById('call-status-message') as HTMLDivElement;
 const phoneNumber = phoneInput?.value?.trim();
 
 // Clear previous status
 if (statusDiv) {
 statusDiv.textContent = '';
 statusDiv.className = 'mt-4 text-sm font-medium';
 }
 
 // Validate phone number FIRST
 if (!phoneNumber) {
 if (statusDiv) {
 statusDiv.textContent = '📞 Please enter your phone number first';
 statusDiv.className = 'mt-4 text-sm font-medium text-red-400';
 }
 return;
 }
 
 const formattedNumber = phoneNumber.replace(/\D/g, '');
 if (formattedNumber.length < 10) {
 if (statusDiv) {
 statusDiv.textContent = '📞 Please enter a valid 10-digit phone number';
 statusDiv.className = 'mt-4 text-sm font-medium text-red-400';
 }
 return;
 }
 
 // Show initiating message
 if (statusDiv) {
 statusDiv.textContent = '📞 Initiating call...';
 statusDiv.className = 'mt-4 text-sm font-medium text-blue-400';
 }
 
 try {
 // Make API call - send phone number WITHOUT +1 prefix (API handles formatting)
 const response = await fetch('/api/telnyx/initiate-call', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 phoneNumber: formattedNumber, // API will add +1 if needed
 businessId: null
 })
 });
 
 const result = await response.json();
 
 // Show result based on API response
 if (statusDiv) {
 if (result.success) {
 statusDiv.textContent = '✅ Call initiated! Answer your phone in 5-10 seconds.';
 statusDiv.className = 'mt-4 text-sm font-medium text-green-400';
 } else {
 statusDiv.textContent = `❌ ${result.message || 'Call failed. Please try again.'}`;
 statusDiv.className = 'mt-4 text-sm font-medium text-red-400';
 }
 }
 
 if (!result.success) {
 logger.error('Landing page call failed', {
 error: result.message,
 status: response.status
 });
 }
 } catch (error) {
 // Show error
 if (statusDiv) {
 statusDiv.textContent = '❌ Network error. Please check your connection and try again.';
 statusDiv.className = 'mt-4 text-sm font-medium text-red-400';
 }
 
 logger.error('Landing page call network error', {
 error: error instanceof Error ? error.message : 'Unknown error'
 });
 }
 }}
 />
 </div>
 
 {/* Phone Number Input - UNDER THE ORB */}
 <div className="max-w-md mx-auto mb-4">
 <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
 Enter your phone number
 </label>
 <input
 type="tel"
 id="phoneInput"
 placeholder="(555) 123-4567"
 className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white text-center text-sm md:text-base placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
 />
 </div>
 
 {/* Status Message - UNDER INPUT, INTEGRATED */}
 <div id="call-status-message" className="mt-4 text-sm font-medium min-h-[24px]"></div>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
 <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
 <div className="text-sky-400 font-semibold mb-2">Real-time Processing</div>
 <div className="text-gray-400">AI analyzes speech instantly</div>
 </div>
 <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
 <div className="text-sky-400 font-semibold mb-2">Neural Networks</div>
 <div className="text-gray-400">Advanced machine learning</div>
 </div>
 <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
 <div className="text-sky-400 font-semibold mb-2">24/7 Active</div>
 <div className="text-gray-400">Always ready to help</div>
 </div>
 </div>
 </div>
 </motion.div>

 </div>
 </section>

 {/* ROI Calculator */}
 <section id="roi-calculator" className="py-12 md:py-16 lg:py-20 relative overflow-hidden">
 {/* Background Elements */}
 <div className="absolute inset-0 via-transparent " />
 <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
 <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl" />
 
 <div className="max-w-6xl mx-auto px-4 relative z-10">
 {/* <ROICalculator /> */}
 </div>
 </section>

 {/* Value Proposition */}
 <section className="py-12 md:py-16 lg:py-20 relative overflow-hidden">
 <div className="max-w-6xl mx-auto px-4 relative z-10">
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.8 }}
 className="text-center mb-8"
 >
 <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white from-white leading-tight">
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
 className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto"
 >
 <div className="bg-white/5 backdrop-blur-xl p-4 md:p-6 rounded-xl border border-white/10 text-center">
 <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-red-400 mb-2 leading-tight">30%</div>
 <p className="text-gray-300 text-sm md:text-base leading-snug">Of calls go to voicemail during business hours</p>
 </div>
 <div className="bg-white/5 backdrop-blur-xl p-4 md:p-6 rounded-xl border border-white/10 text-center">
 <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-yellow-400 mb-2 leading-tight">85%</div>
 <p className="text-gray-300 text-sm md:text-base leading-snug">Of callers won&apos;t leave a message</p>
 </div>
 <div className="bg-white/5 backdrop-blur-xl p-4 md:p-6 rounded-xl border border-white/10 text-center">
 <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-green-400 mb-2 leading-tight">$500+</div>
 <p className="text-gray-300 text-sm md:text-base leading-snug">Average value of a booked job</p>
 </div>
 </motion.div>
 </div>
 </section>

 {/* How It Works */}
 <section id="how-it-works" className="py-12 md:py-16 lg:py-20 relative overflow-hidden">
 {/* Background Elements */}
 <div className="absolute inset-0 via-transparent " />
 <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
 <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl" />
 
 <div className="max-w-6xl mx-auto px-4 relative z-10">
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.8 }}
 className="text-center mb-6 md:mb-8"
 >
 <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white from-white leading-tight">
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
 <div className="absolute inset-0 bg-white/5 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500" />
 <div className="relative bg-gray-800/40 backdrop-blur-xl p-4 md:p-6 rounded-xl border border-gray-700/50 text-center shadow-2xl group-hover:border-blue-500/30 transition-all duration-500">
 <div className="relative mb-6">
 <div className="w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center mx-auto text-2xl md:text-3xl font-bold shadow-lg group-hover:shadow-blue-500/25 transition-all duration-500">
 1
 </div>
 <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
 <Phone className="w-3 h-3 text-white" />
 </div>
 </div>
 <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 text-white leading-tight">
 AI Answers in &lt;1 Ring
 </h3>
 <p className="text-gray-300 text-sm md:text-base leading-snug">
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
 <div className="absolute inset-0 bg-white/5 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500" />
 <div className="relative bg-gray-800/40 backdrop-blur-xl p-4 md:p-6 rounded-xl border border-gray-700/50 text-center shadow-2xl group-hover:border-sky-500/30 transition-all duration-500">
 <div className="relative mb-6">
 <div className="w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center mx-auto text-2xl md:text-3xl font-bold shadow-lg group-hover:shadow-sky-500/25 transition-all duration-500">
 2
 </div>
 <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
 <CheckCircle className="w-4 h-4 text-white" />
 </div>
 </div>
 <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 text-white leading-tight">
 Qualifies Leads
 </h3>
 <p className="text-gray-300 text-sm md:text-base leading-snug">
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
 viewport={{ once: true }}
 transition={{ duration: 0.8, delay: 0.3 }}
 whileHover={{ y: -10, scale: 1.02 }}
 className="group relative"
 >
 <div className="absolute inset-0 bg-white/5 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500" />
 <div className="relative bg-gray-800/40 backdrop-blur-xl p-4 md:p-6 rounded-xl border border-gray-700/50 text-center shadow-2xl group-hover:border-cyan-500/30 transition-all duration-500">
 <div className="relative mb-6">
 <div className="w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center mx-auto text-2xl md:text-3xl font-bold shadow-lg group-hover:shadow-cyan-500/25 transition-all duration-500">
 3
 </div>
 <div className="absolute -top-2 -right-2 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
 <Calendar className="w-4 h-4 text-white" />
 </div>
 </div>
 <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 text-white leading-tight">
 Books Appointments
 </h3>
 <p className="text-gray-300 text-sm md:text-base leading-snug">
 Seamlessly schedules qualified leads directly into your calendar and sends SMS confirmations.
 </p>
 <div className="mt-6 flex justify-center">
 <div className="w-12 h-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full" />
 </div>
 </div>
 </motion.div>
 </div>
 
 {/* Connection Lines */}
 <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 from-transparent to-transparent z-0" style={{ transform: 'translateY(-50%)' }} />
 </div>
 </section>

 {/* Dashboard Preview */}
 <section className="py-12 md:py-16 lg:py-20 via-black/50 relative overflow-hidden">
 {/* Background Elements */}
 <div className="absolute inset-0 via-transparent " />
 <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
 <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
 
 <div className="max-w-7xl mx-auto px-4 relative z-10">
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.8 }}
 className="text-center mb-6 md:mb-8"
 >
 <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white from-white leading-tight">
 Professional Dashboard
 </h2>
 <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
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
 <div className="bg-gray-800/20 backdrop-blur-2xl p-4 md:p-6 rounded-xl border border-gray-700/30 shadow-2xl">
 {/* Dashboard Header */}
 <div className="flex items-center justify-between mb-6">
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
 
 {/* Two-panel preview: Recent Calls / Upcoming Appointments */}
 <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8">
 {/* Recent Calls */}
 <div className="bg-gray-900/60 border border-gray-700/60 rounded-xl p-5 md:p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
 <Phone className="w-5 h-5 text-sky-400" />
 Recent Calls
 </h3>
 <span className="text-xs text-gray-500">Today</span>
 </div>
 <div className="space-y-3">
 {[
 { name: 'Mike R.', when: '2 min ago', detail: 'Booked: AC repair Tue 9am', booked: true },
 { name: 'Sarah K.', when: '18 min ago', detail: 'Booked: Roof inspection Thu 2pm', booked: true },
 { name: 'John D.', when: '1 hr ago', detail: 'Message taken: callback requested', booked: false },
 { name: 'Lisa M.', when: '2 hrs ago', detail: 'Booked: Interior painting estimate', booked: true },
 ].map((c) => (
 <div key={c.name} className="flex items-start gap-3 py-2 border-b border-gray-800/60 last:border-0">
 <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${c.booked ? 'bg-sky-400' : 'bg-gray-500'}`} />
 <div className="flex-1 min-w-0">
 <div className="flex items-baseline justify-between gap-2">
 <span className="text-sm font-medium text-white truncate">{c.name}</span>
 <span className="text-xs text-gray-500 flex-shrink-0">{c.when}</span>
 </div>
 <p className="text-xs text-gray-400 mt-0.5">{c.detail}</p>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Upcoming Appointments */}
 <div className="bg-gray-900/60 border border-gray-700/60 rounded-xl p-5 md:p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
 <Calendar className="w-5 h-5 text-sky-400" />
 Upcoming Appointments
 </h3>
 <span className="text-xs text-gray-500">This week</span>
 </div>
 <div className="space-y-3">
 {[
 { name: 'Mike R.', when: 'Tue 9:00 AM', service: 'AC repair · 4421 Burnet Rd' },
 { name: 'Sarah K.', when: 'Thu 2:00 PM', service: 'Roof inspection · 1208 W 38th' },
 { name: 'David T.', when: 'Fri 10:30 AM', service: 'HVAC tune-up · 902 E Cesar Chavez' },
 { name: 'Lisa M.', when: 'Mon 1:00 PM', service: 'Interior painting estimate' },
 ].map((a) => (
 <div key={a.name + a.when} className="flex items-start gap-3 py-2 border-b border-gray-800/60 last:border-0">
 <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-sky-400" />
 <div className="flex-1 min-w-0">
 <div className="flex items-baseline justify-between gap-2">
 <span className="text-sm font-medium text-white truncate">{a.name}</span>
 <span className="text-xs text-gray-500 flex-shrink-0">{a.when}</span>
 </div>
 <p className="text-xs text-gray-400 mt-0.5">{a.service}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="text-center">
 <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-4xl mx-auto">
 Every call, every appointment, one screen. Listen to recordings, read transcripts, and watch your booked jobs roll in.
 </p>
 </div>
 </div>
 </motion.div>
 </div>
 </section>

 {/* Pricing Section */}
 <section id="pricing" className="py-12 md:py-16 lg:py-20 via-black/50 relative overflow-hidden">
 {/* Background Elements */}
 <div className="absolute inset-0 via-transparent " />
 <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
 <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl" />
 
 <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.8 }}
 className="mb-6 md:mb-8"
 >
 <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white leading-tight">
 Simple, Transparent Pricing
 </h2>
 <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
 Two plans. Flat monthly pricing. No per-booking fees, no surprises.
 </p>
 </motion.div>

 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 50 }}
 whileInView={{ opacity: 1, scale: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 1, delay: 0.2 }}
 className="relative grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
 >
 {/* Starter Plan */}
 <div className="relative bg-gray-800/30 backdrop-blur-2xl p-6 md:p-8 rounded-xl border border-gray-700/50 shadow-2xl text-left">
 <h3 className="text-xl md:text-2xl font-bold mb-1 text-white">Starter</h3>
 <p className="text-sm text-gray-400 mb-6">After-hours coverage only</p>

 <div className="mb-6 flex items-baseline gap-2">
 <span className="text-4xl md:text-5xl font-bold text-white">$499</span>
 <span className="text-base text-gray-400">/mo</span>
 </div>

 <div className="space-y-3 mb-8">
 {[
 "AI answers calls outside business hours",
 "Lead qualification & message capture",
 "Calendar booking & SMS confirmations",
 "Missed-call recovery texts",
 "Call recordings & transcripts",
 "Dashboard & ROI tracking",
 ].map((feature) => (
 <div key={feature} className="flex items-start gap-3">
 <CheckCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
 <span className="text-gray-200 text-sm md:text-base">{feature}</span>
 </div>
 ))}
 </div>

 <Link
 href="/contact"
 className="block w-full text-center bg-white/10 text-white px-4 py-3 rounded-lg text-sm font-semibold border border-white/20 hover:bg-white/20 transition-colors"
 >
 Get Started
 </Link>
 </div>

 {/* Full 24/7 Plan */}
 <div className="relative bg-gray-800/30 backdrop-blur-2xl p-6 md:p-8 rounded-xl border border-sky-500/40 shadow-2xl text-left">
 <div className="absolute -top-3 left-6">
 <div className="bg-sky-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
 Most Popular
 </div>
 </div>

 <h3 className="text-xl md:text-2xl font-bold mb-1 text-white">Full 24/7</h3>
 <p className="text-sm text-gray-400 mb-6">Around-the-clock coverage</p>

 <div className="mb-6 flex items-baseline gap-2">
 <span className="text-4xl md:text-5xl font-bold text-white">$899</span>
 <span className="text-base text-gray-400">/mo</span>
 </div>

 <div className="space-y-3 mb-8">
 {[
 "AI answers every call, 24/7",
 "Lead qualification & message capture",
 "Calendar booking & SMS confirmations",
 "Missed-call recovery texts",
 "Call recordings & transcripts",
 "Dashboard & ROI tracking",
 "Custom business greeting",
 "Google & Microsoft Calendar integration",
 ].map((feature) => (
 <div key={feature} className="flex items-start gap-3">
 <CheckCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
 <span className="text-gray-200 text-sm md:text-base">{feature}</span>
 </div>
 ))}
 </div>

 <Link
 href="/contact"
 className="block w-full text-center bg-sky-500 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-sky-400 transition-colors"
 >
 Get Started
 </Link>
 </div>
 </motion.div>

 <p className="text-gray-400 text-xs md:text-sm mt-8">
 Flat monthly pricing • No per-booking fees • Cancel anytime
 </p>
 </div>
 </section>


 {/* Final CTA Banner */}
 <section className="py-12 md:py-16 lg:py-20 bg-blue-600/10 border-y border-gray-800/50 relative overflow-hidden">
 {/* Background Elements */}
 <div className="absolute inset-0 via-transparent " />
 <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
 <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl" />
 
 <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.8 }}
 className="mb-6"
 >
 <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white from-white leading-tight">
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
 <Link
 href="/contact"
 className="bg-white/10 backdrop-blur-xl text-white px-4 py-2 rounded-lg text-sm font-semibold border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 shadow-lg flex items-center justify-center gap-2 inline-block"
 >
 <Zap className="w-4 h-4" />
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
 <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
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



