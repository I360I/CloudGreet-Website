"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState('')
  const [tokenValid, setTokenValid] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)

  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      validateToken(tokenParam)
    } else {
      setError('Invalid or missing reset token')
      setCheckingToken(false)
    }
  }, [searchParams])

  const validateToken = async (token: string) => {
    try {
      const response = await fetch(
  '/api/auth/validate-reset-token', {
        method: 'POST',
  headers: {
          'Content-Type': 'application/json',
        }

    catch (error
) {

      console.error('Error:', error);

      throw error;

    },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (result.success) {
        setTokenValid(true)
      } else {
        setError(result.error || 'Invalid or expired reset token')
      }
    } try {
   // TODO: Add proper error handling
 } catch (error) {
      setError('Failed to validate reset token')
    } finally {
      setCheckingToken(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setIsLoading(false)
      return
    } try {
   // TODO: Add proper error handling
 } catch (error) {
    logger.error('Error:', error);
    throw error;
  }
  try {
      const response = await fetch(
  '/api/auth/reset-password', {
        method: 'POST',
  headers: {
          'Content-Type': 'application/json',
        }


    catch (error
) {


      console.error('Error:', error);


      throw error;


    },
        body: JSON.stringify({ token, password }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(result.error || 'Failed to reset password')
      }
    } try {
   // TODO: Add proper error handling
 } catch (error) {
      setError('Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-white text-lg">Validating reset token...</p>
        </motion.div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-green-400" />
            </motion.div>
            
            <h1 className="text-2xl font-bold text-white mb-4">Password Reset Successfully!</h1>
            <p className="text-gray-400 mb-6">
              Your password has been updated. You will be redirected to the login page shortly.
            </p>
            
            <Link
              href="/login"
              className="inline-block bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300"
            >
              Go to Login
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/login" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2">Reset Your Password</h1>
              <p className="text-gray-400 text-lg">Enter your new password below</p>
            </motion.div>
          </div>

          {/* Reset Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
          >
            {!tokenValid ? (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </motion.div>
                
                <h2 className="text-xl font-bold text-white mb-4">Invalid Reset Link</h2>
                <p className="text-gray-400 mb-6">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
                
                <Link
                  href="/login"
                  className="inline-block bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300"
                >
                  Request New Reset Link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-3">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full pl-12 pr-14 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">Must be at least 8 characters long</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-3">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-14 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-900/20 border border-red-500/30 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-4 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        className="rounded-full h-5 w-5 border-b-2 border-white mr-3"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <span>Resetting Password...</span>
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-white text-lg">Loading...</p>
        </motion.div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
