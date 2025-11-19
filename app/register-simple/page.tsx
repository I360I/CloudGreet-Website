"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { PLACEHOLDERS, SUCCESS_MESSAGES } from '@/lib/constants'
import { buildRegistrationPayload, type RegistrationFormData } from '@/lib/auth/register-payload'
import { setAuthToken } from '@/lib/auth/token-manager'

export default function SimpleRegisterPage() {
  type FormState = RegistrationFormData & {
    firstName: string
    lastName: string
  }

  const [formData, setFormData] = useState<FormState>({
    firstName: '',
    lastName: '',
    businessName: '',
    businessType: 'HVAC',
    email: '',
    password: '',
    phone: '',
    address: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Please provide both your first and last name.')
      setIsLoading(false)
      return
    }

    try {
      const payload = buildRegistrationPayload(formData)

      const response = await fetch('/api/auth/register-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        setError(errorData?.message || `Registration failed (${response.status})`)
        return
      }

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        setError('Invalid response from server')
        return
      }

      if (result.success) {
        // Store token securely in httpOnly cookie
        await setAuthToken(result.data.token)
        
        // Store user/business data in localStorage (non-sensitive)
        localStorage.setItem('user', JSON.stringify(result.data.user))
        localStorage.setItem('business', JSON.stringify(result.data.business))
        
        setSuccess(true)
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        setError(result.message || 'Registration failed')
      }
    } catch (err) {
      setError('Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/40 backdrop-blur-xl rounded-xl p-4 md:p-6 max-w-md w-full border border-white/10 shadow-2xl"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-6 h-6 text-green-400" />
            </motion.div>
            <h1 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight">{SUCCESS_MESSAGES.REGISTRATION}</h1>
            <p className="text-sm md:text-base text-gray-300 mb-4 leading-snug">Redirecting to your dashboard...</p>
            <motion.div
              className="w-full bg-gray-700 rounded-full h-2"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2 }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/40 backdrop-blur-xl rounded-xl p-4 md:p-6 max-w-md w-full border border-white/10 shadow-2xl"
      >
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400"
            >
              CloudGreet
            </motion.div>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">Create Your Account</h1>
          <p className="text-sm md:text-base text-gray-400 leading-snug">Start your AI receptionist journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="firstName">
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
                placeholder={PLACEHOLDERS.FIRST_NAME}
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="lastName">
                Last Name *
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
                placeholder={PLACEHOLDERS.LAST_NAME}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              placeholder={PLACEHOLDERS.BUSINESS_NAME}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Type
            </label>
            <select
              value={formData.businessType}
              onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
            >
              <option value="HVAC">HVAC</option>
              <option value="Painting">Painting</option>
              <option value="Roofing">Roofing</option>
              <option value="General Services">General Services</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              placeholder={PLACEHOLDERS.EMAIL}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 pr-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
                placeholder={PLACEHOLDERS.PASSWORD}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              placeholder={PLACEHOLDERS.PHONE}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Address *
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              placeholder={PLACEHOLDERS.ADDRESS}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm shadow-lg"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </motion.button>
        
          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-300">
              I agree to the <a href="/terms" className="text-blue-400 hover:text-blue-300">Terms of Service</a> and <a href="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</a>
            </label>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

