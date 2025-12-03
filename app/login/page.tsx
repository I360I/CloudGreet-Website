"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { setAuthToken } from '@/lib/auth/token-manager'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
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
        
        // Store user/business data in localStorage (non-sensitive)
        localStorage.setItem('user', JSON.stringify(result.data.user))
        if (result.data.business) {
          localStorage.setItem('business', JSON.stringify(result.data.business))
        }
        
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
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">Welcome Back</h1>
          <p className="text-sm md:text-base text-gray-400 leading-snug">Sign in to your AI receptionist</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 pr-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm shadow-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center text-sm text-gray-400">
            <Link href="/register-simple" className="text-purple-400 hover:text-purple-300">
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
