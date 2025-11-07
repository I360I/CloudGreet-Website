"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import { PLACEHOLDERS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants'

export default function SimpleRegisterPage() {
  const [formData, setFormData] = useState({
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

    try {
      const response = await fetch(
  '/api/auth/register-simple', {
        method: 'POST',
  headers: {
          'Content-Type': 'application/json',
        }


    catch (error
) {


      console.error('Error:', error);


      throw error;


    },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        // Store token in both localStorage and cookies
        localStorage.setItem('token', result.data.token)
        localStorage.setItem('user', JSON.stringify(result.data.user))
        localStorage.setItem('business', JSON.stringify(result.data.business))
        
        // Set cookie for middleware
        document.cookie = `token=${result.data.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
        
        setSuccess(true)
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        setError(result.message || 'Registration failed')
      }
    } try {
   // TODO: Add proper error handling
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
          className="bg-black/40 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-purple-500/20"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-8 h-8 text-green-400" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-4">{SUCCESS_MESSAGES.REGISTRATION}</h1>
            <p className="text-gray-300 mb-6">Redirecting to your dashboard...</p>
            <motion.div
              className="w-full bg-gray-700 rounded-full h-2"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2 }}
            />
          
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
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
        className="bg-black/40 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-purple-500/20"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400"
            >
              CloudGreet
            </motion.div>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Create Your Account</h1>
          <p className="text-gray-400">Start your AI receptionist journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
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
                className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
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
              className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
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
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
            I agree to the <a href="/terms" className="text-blue-600 hover:text-blue-500">Terms of Service</a> and <a href="/privacy" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>
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
