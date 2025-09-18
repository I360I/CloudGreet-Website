"use client"

import React, { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, ArrowRight, Play, CheckCircle, Shield, 
  Calendar, Zap, Eye, EyeOff
} from 'lucide-react'
import SilkRibbon from './SilkRibbon'

export default function Hero() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const form = event.currentTarget
      const formData = new FormData(form)
      
      // Get form values directly from the form elements
      const businessName = (form.querySelector('[name="business_name"]') as HTMLInputElement)?.value || ''
      const businessTypeRaw = (form.querySelector('[name="business_type"]') as HTMLSelectElement)?.value || ''
      const email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value || ''
      const phone = (form.querySelector('[name="phone"]') as HTMLInputElement)?.value || ''
      const address = (form.querySelector('[name="address"]') as HTMLInputElement)?.value || ''
      const password = (form.querySelector('[name="password"]') as HTMLInputElement)?.value || ''
      const confirmPassword = (form.querySelector('[name="confirmPassword"]') as HTMLInputElement)?.value || ''
      
      // Validate required fields
      if (!businessName.trim()) {
        setError('Business name is required')
        setIsLoading(false)
        return
      }
      
      if (!businessTypeRaw) {
        setError('Please select a business type')
        setIsLoading(false)
        return
      }
      
      if (!email.trim()) {
        setError('Email is required')
        setIsLoading(false)
        return
      }
      
      if (!phone.trim()) {
        setError('Phone number is required')
        setIsLoading(false)
        return
      }
      
      if (!address.trim()) {
        setError('Business address is required')
        setIsLoading(false)
        return
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address')
        setIsLoading(false)
        return
      }
      
      // Validate phone format (basic)
      const phoneRegex = /^[\d\s\-\+\(\)]+$/
      if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
        setError('Please enter a valid phone number')
        setIsLoading(false)
        return
      }
      
      // Validate passwords match
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setIsLoading(false)
        return
      }
      
      // Validate password strength
      if (password.length < 8) {
        setError('Password must be at least 8 characters long')
        setIsLoading(false)
        return
      }
      
      // Map business type to expected format
      const businessTypeMap: { [key: string]: string } = {
        'hvac': 'HVAC',
        'roofing': 'Roofing', 
        'painting': 'Paint',
        'other': 'HVAC' // Default to HVAC for other
      }
      
      const businessType = businessTypeMap[businessTypeRaw] || 'HVAC'
      
      // Default services based on business type
      const defaultServices: { [key: string]: string[] } = {
        'HVAC': ['Heating Repair', 'Cooling Repair', 'Maintenance', 'Installation'],
        'Roofing': ['Roof Repair', 'Roof Replacement', 'Gutter Cleaning', 'Inspection'],
        'Paint': ['Interior Painting', 'Exterior Painting', 'Color Consultation', 'Touch-ups']
      }
      
      const businessData = {
        business_name: businessName,
        business_type: businessType,
        email: email,
        phone: phone,
        address: address,
        owner_name: businessName, // Use business name as owner name for now
        website: '',
        password: password,
        services: defaultServices[businessType] || ['General Service'],
        service_areas: ['Local Area'] // Default service area
      }

      // Create account directly from landing page
      console.log('Sending business data:', businessData)
      const response = await fetch('/api/auth/register-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Account creation failed')
      }
      
      const result = await response.json()

      if (result.success) {
        // Store the token and user data
        localStorage.setItem('token', result.data.token)
        localStorage.setItem('user', JSON.stringify(result.data.user))
        localStorage.setItem('business', JSON.stringify(result.data.business))
        
        // Store the form data for pre-filling the onboarding wizard
        localStorage.setItem('businessData', JSON.stringify({
          business_name: businessName,
          business_type: businessType,
          owner_name: businessName, // Use business name as owner name
          email: email,
          phone: phone,
          website: '',
          address: address,
          services: defaultServices[businessType] || ['General Service'],
          service_areas: ['Local Area']
        }))
        
        // Set account status to trigger onboarding wizard
        localStorage.setItem('accountStatus', 'demo')
        
        // Redirect to dashboard (which will show onboarding wizard with pre-filled data)
        window.location.href = '/dashboard'
      } else {
        throw new Error(result.error || 'Account creation failed')
      }
    } catch (error) {
      console.error('Signup error:', error)
      setError('Account creation failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-black to-slate-900">
      {/* Promo Ribbon */}
      <SilkRibbon />

      {/* Vignette overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center min-h-screen flex flex-col items-center justify-center pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-purple-300 leading-normal tracking-tight pb-2">
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
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-2xl transform hover:scale-105"
          >
            <Zap className="w-6 h-6 mr-3" />
            Get Started
          </a>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-wrap justify-center items-center gap-8 text-gray-400"
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

        {/* Quick Signup Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-16 max-w-2xl mx-auto"
        >
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
            <h3 className="text-2xl font-bold text-white mb-6">Get Started in 60 Seconds</h3>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="business_name"
                  placeholder="Business Name"
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  name="business_type"
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Industry</option>
                  <option value="hvac">HVAC</option>
                  <option value="roofing">Roofing</option>
                  <option value="painting">Painting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <input
                type="text"
                name="address"
                placeholder="Business Address"
                required
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create Password (min 8 characters)"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Error Display */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Setting Up...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5 mr-3" />
                    Create Account
                  </>
                )}
              </button>
            </form>
            <p className="text-gray-400 text-sm mt-4 text-center">
              No credit card required • Setup takes minutes
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
