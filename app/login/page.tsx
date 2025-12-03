"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { setAuthToken } from '@/lib/auth/token-manager'
import FormInput from '@/app/components/ui/FormInput'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        setError(errorData?.message || `Login failed (${response.status})`)
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
        
        // User/business data will be fetched from API when needed
        // No need to store in localStorage - API provides fresh data
        
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        setError(result.message || 'Login failed')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/60 backdrop-blur-xl rounded-xl p-6 md:p-8 max-w-md w-full border border-gray-800 shadow-2xl"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-secondary-400"
            >
              CloudGreet
            </motion.div>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-base text-gray-400">Sign in to your AI receptionist</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <FormInput
            type="email"
            value={formData.email}
            onChange={(val) => setFormData({ ...formData, email: val })}
            label="Email"
            placeholder="Enter your email"
            required
            id="email"
            name="email"
            autoComplete="email"
          />

          {/* Password Input */}
          <FormInput
            type="password"
            value={formData.password}
            onChange={(val) => setFormData({ ...formData, password: val })}
            label="Password"
            placeholder="Enter your password"
            required
            showPasswordToggle
            id="password"
            name="password"
            autoComplete="current-password"
          />

          {/* Server Error Message */}
          {error && (
            <motion.div
              role="alert"
              aria-live="polite"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-error-500/10 border border-error-500/30 text-error-400 px-4 py-3 rounded-lg text-sm shadow-lg"
            >
              {error}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full min-h-[44px] px-4 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg transition-all duration-normal"
            aria-label={isLoading ? 'Signing in' : 'Sign in to your account'}
          >
            {isLoading ? (
              <>
                <motion.div
                  className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  aria-hidden="true"
                />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </motion.button>

          {/* Sign Up Link */}
          <div className="text-center text-sm text-gray-400 pt-2">
            Don&apos;t have an account?{' '}
            <Link 
              href="/register-simple" 
              className="text-primary-400 hover:text-primary-300 font-medium underline transition-colors"
            >
              Sign up
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
