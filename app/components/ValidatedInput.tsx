'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Eye, EyeOff, AlertCircle } from 'lucide-react'

interface ValidatedInputProps {
  label: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: string) => string | null
  }
  showStrength?: boolean
  className?: string
  disabled?: boolean
  autoComplete?: string
}

export default function ValidatedInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  validation,
  showStrength = false,
  className = '',
  disabled = false,
  autoComplete
}: ValidatedInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (value && validation) {
      validateInput(value)
    } else {
      setError(null)
      setIsValid(null)
    }
  }, [value, validation, validateInput])

  const validateInput = (inputValue: string) => {
    if (!validation) return

    // Required validation
    if (required && !inputValue.trim()) {
      setError(`${label} is required`)
      setIsValid(false)
      return
    }

    // Min length validation
    if (validation.minLength && inputValue.length < validation.minLength) {
      setError(`${label} must be at least ${validation.minLength} characters`)
      setIsValid(false)
      return
    }

    // Max length validation
    if (validation.maxLength && inputValue.length > validation.maxLength) {
      setError(`${label} must be no more than ${validation.maxLength} characters`)
      setIsValid(false)
      return
    }

    // Pattern validation
    if (validation.pattern && !validation.pattern.test(inputValue)) {
      setError(`${label} format is invalid`)
      setIsValid(false)
      return
    }

    // Custom validation
    if (validation.custom) {
      const customError = validation.custom(inputValue)
      if (customError) {
        setError(customError)
        setIsValid(false)
        return
      }
    }

    // Email validation
    if (type === 'email' && inputValue) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(inputValue)) {
        setError('Please enter a valid email address')
        setIsValid(false)
        return
      }
    }

    // Phone validation
    if (type === 'tel' && inputValue) {
      const phonePattern = /^[\+]?[1-9][\d]{0,15}$/
      const cleanPhone = inputValue.replace(/\D/g, '')
      if (cleanPhone.length < 10) {
        setError('Please enter a valid phone number')
        setIsValid(false)
        return
      }
    }

    // URL validation
    if (type === 'url' && inputValue) {
      try {
        new URL(inputValue)
      } catch {
        setError('Please enter a valid URL')
        setIsValid(false)
        return
      }
    }

    setError(null)
    setIsValid(true)
  }

  const getPasswordStrength = (password: string) => {
    let score = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }

    Object.values(checks).forEach(check => {
      if (check) score++
    })

    return {
      score,
      checks,
      strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong'
    }
  }

  const passwordStrength = showStrength && type === 'password' && value ? getPasswordStrength(value) : null

  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-400">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`
            w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-400 
            focus:outline-none transition-all duration-200
            ${isFocused ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-gray-700'}
            ${isValid === true ? 'border-green-500' : ''}
            ${error ? 'border-red-500' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        
        {/* Password toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
        
        {/* Validation icon */}
        {value && isValid !== null && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValid ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
        )}
      </div>
      
      {/* Password strength indicator */}
      {passwordStrength && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Password strength:</span>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-1 w-4 rounded ${
                    level <= passwordStrength.score
                      ? passwordStrength.strength === 'weak'
                        ? 'bg-red-500'
                        : passwordStrength.strength === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <span className={`text-xs font-medium ${
              passwordStrength.strength === 'weak' ? 'text-red-400' :
              passwordStrength.strength === 'medium' ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {passwordStrength.strength}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(passwordStrength.checks).map(([check, passed]) => (
              <div key={check} className="flex items-center space-x-1">
                {passed ? (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                ) : (
                  <XCircle className="w-3 h-3 text-gray-500" />
                )}
                <span className={passed ? 'text-green-400' : 'text-gray-500'}>
                  {check === 'length' ? '8+ chars' :
                   check === 'lowercase' ? 'lowercase' :
                   check === 'uppercase' ? 'uppercase' :
                   check === 'number' ? 'number' :
                   'special char'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center space-x-2 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
