'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onValidChange?: (isValid: boolean) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
  id?: string
  name?: string
}

export default function PhoneInput({
  value,
  onChange,
  onValidChange,
  label,
  placeholder = '(555) 123-4567',
  required = false,
  disabled = false,
  error,
  className,
  id = 'phone-input',
  name = 'phone',
}: PhoneInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [touched, setTouched] = useState(false)

  // Format phone number as user types
  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '')
    
    // Limit to 10 digits (US phone number)
    const limitedDigits = digits.slice(0, 10)
    
    // Format as (XXX) XXX-XXXX
    if (limitedDigits.length === 0) return ''
    if (limitedDigits.length <= 3) return `(${limitedDigits}`
    if (limitedDigits.length <= 6) return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
  }

  // Validate phone number (10 digits for US)
  const validatePhoneNumber = (input: string): boolean => {
    const digits = input.replace(/\D/g, '')
    return digits.length === 10
  }

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const formatted = formatPhoneNumber(rawValue)
    onChange(formatted)
    
    // Validate
    const valid = validatePhoneNumber(formatted)
    setIsValid(valid)
    onValidChange?.(valid)
  }

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false)
    setTouched(true)
    
    // Final validation
    const valid = validatePhoneNumber(value)
    setIsValid(valid)
    onValidChange?.(valid)
  }

  // Update validation when value changes externally
  useEffect(() => {
    if (value) {
      const valid = validatePhoneNumber(value)
      setIsValid(valid)
      onValidChange?.(valid)
    } else {
      setIsValid(null)
    }
  }, [value, onValidChange])

  // Get unformatted value (for form submission)
  const getUnformattedValue = (): string => {
    return value.replace(/\D/g, '')
  }

  // Validation state
  const showValidation = touched && value.length > 0
  const showError = (error || (showValidation && isValid === false))
  const showSuccess = showValidation && isValid === true && !error

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-error-500 ml-1" aria-label="required">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <input
          type="tel"
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="tel"
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${id}-error` : undefined}
          aria-required={required}
          className={cn(
            'w-full px-4 py-3 pr-12 min-h-[44px]',
            'bg-white/5 backdrop-blur-xl',
            'border rounded-lg',
            'text-white placeholder-gray-400',
            'transition-all duration-normal',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
            disabled && 'opacity-50 cursor-not-allowed',
            showError && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
            showSuccess && 'border-success-500 focus:border-success-500 focus:ring-success-500/20',
            !showError && !showSuccess && 'border-white/10 focus:border-primary-500 focus:ring-primary-500/20'
          )}
        />

        {/* Validation Icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <AnimatePresence mode="wait">
            {showSuccess && (
              <motion.div
                key="success"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.2 }}
              >
                <Check className="w-5 h-5 text-success-500" aria-hidden="true" />
              </motion.div>
            )}
            {showError && (
              <motion.div
                key="error"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.2 }}
              >
                <AlertCircle className="w-5 h-5 text-error-500" aria-hidden="true" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {showError && (
          <motion.div
            id={`${id}-error`}
            role="alert"
            aria-live="polite"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex items-start gap-2 text-sm text-error-400"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              {error || 'Please enter a valid 10-digit phone number'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      {!showError && !showSuccess && (
        <p className="mt-2 text-xs text-gray-400">
          Format: (XXX) XXX-XXXX
        </p>
      )}

      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex items-center gap-2 text-sm text-success-400"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>Valid phone number</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden input for unformatted value (for form submission) */}
      <input
        type="hidden"
        name={`${name}_unformatted`}
        value={getUnformattedValue()}
        aria-hidden="true"
      />
    </div>
  )
}

