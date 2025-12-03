"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { PLACEHOLDERS, SUCCESS_MESSAGES } from '@/lib/constants'
import { buildRegistrationPayload, type RegistrationFormData } from '@/lib/auth/register-payload'
import { setAuthToken } from '@/lib/auth/token-manager'
import FormInput from '@/app/components/ui/FormInput'
import PhoneInput from '@/app/components/ui/PhoneInput'

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPhoneValid, setIsPhoneValid] = useState(false)

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
        
        // User/business data will be fetched from API when needed
        // No need to store in localStorage - API provides fresh data
        
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
          className="bg-black/40 backdrop-blur-xl rounded-xl p-6 md:p-8 max-w-md w-full border border-white/10 shadow-2xl"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-8 h-8 text-success-400" aria-hidden="true" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {SUCCESS_MESSAGES.REGISTRATION}
            </h1>
            <p className="text-base text-gray-300 mb-6">
              Redirecting to your dashboard...
            </p>
            <motion.div
              className="w-full bg-gray-800 rounded-full h-2 overflow-hidden"
              role="progressbar"
              aria-label="Loading progress"
              aria-valuenow={50}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    )
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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Create Your Account</h1>
          <p className="text-base text-gray-400">Start your AI receptionist journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormInput
              type="text"
              value={formData.firstName}
              onChange={(val) => setFormData({ ...formData, firstName: val })}
              label="First Name"
              placeholder={PLACEHOLDERS.FIRST_NAME}
              required
              id="firstName"
              name="firstName"
              autoComplete="given-name"
            />
            <FormInput
              type="text"
              value={formData.lastName}
              onChange={(val) => setFormData({ ...formData, lastName: val })}
              label="Last Name"
              placeholder={PLACEHOLDERS.LAST_NAME}
              required
              id="lastName"
              name="lastName"
              autoComplete="family-name"
            />
          </div>

          {/* Business Name */}
          <FormInput
            type="text"
            value={formData.businessName}
            onChange={(val) => setFormData({ ...formData, businessName: val })}
            label="Business Name"
            placeholder={PLACEHOLDERS.BUSINESS_NAME}
            required
            id="businessName"
            name="businessName"
            autoComplete="organization"
          />

          {/* Business Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Type
            </label>
            <select
              value={formData.businessType}
              onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
              className="w-full px-4 py-3 min-h-[44px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            >
              <option value="HVAC">HVAC</option>
              <option value="Painting">Painting</option>
              <option value="Roofing">Roofing</option>
              <option value="General Services">General Services</option>
            </select>
          </div>

          {/* Email */}
          <FormInput
            type="email"
            value={formData.email}
            onChange={(val) => setFormData({ ...formData, email: val })}
            label="Email"
            placeholder={PLACEHOLDERS.EMAIL}
            required
            id="email"
            name="email"
            autoComplete="email"
          />

          {/* Password with Strength Meter */}
          <FormInput
            type="password"
            value={formData.password}
            onChange={(val) => setFormData({ ...formData, password: val })}
            label="Password"
            placeholder={PLACEHOLDERS.PASSWORD}
            required
            showPasswordToggle
            id="password"
            name="password"
            autoComplete="new-password"
            helperText="Must be at least 8 characters with uppercase, lowercase, and number"
          />

          {/* Phone Number with Formatting */}
          <PhoneInput
            value={formData.phone}
            onChange={(val) => setFormData({ ...formData, phone: val })}
            onValidChange={setIsPhoneValid}
            label="Phone Number"
            placeholder={PLACEHOLDERS.PHONE}
            required
            id="phone"
            name="phone"
          />

          {/* Business Address */}
          <FormInput
            type="text"
            value={formData.address}
            onChange={(val) => setFormData({ ...formData, address: val })}
            label="Business Address"
            placeholder={PLACEHOLDERS.ADDRESS}
            required
            id="address"
            name="address"
            autoComplete="street-address"
          />

          {error && (
            <motion.div
              role="alert"
              aria-live="polite"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-error-500/10 border border-error-500/30 rounded-lg text-error-400 text-sm shadow-lg"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full min-h-[44px] px-4 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg transition-all duration-normal flex items-center justify-center gap-2"
            aria-label={isLoading ? 'Creating your account' : 'Create account'}
          >
            {isLoading ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  aria-hidden="true"
                />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </motion.button>
        
          <div className="flex items-start gap-3">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="mt-1 h-5 w-5 min-h-[20px] min-w-[20px] text-primary-500 focus:ring-2 focus:ring-primary-500 border-gray-600 rounded bg-white/5 transition-all"
              aria-describedby="terms-description"
            />
            <label htmlFor="terms" id="terms-description" className="block text-sm text-gray-300 leading-relaxed">
              I agree to the{' '}
              <a href="/terms" className="text-primary-400 hover:text-primary-300 underline transition-colors">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary-400 hover:text-primary-300 underline transition-colors">
                Privacy Policy
              </a>
            </label>
          </div>
        </form>

        <div className="text-center mt-8">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="text-primary-400 hover:text-primary-300 font-medium underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

