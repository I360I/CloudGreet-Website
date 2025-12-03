'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type InputType = 'text' | 'email' | 'password' | 'tel' | 'url' | 'number'

interface ValidationRule {
  validate: (value: string) => boolean
  message: string
}

interface FormInputProps {
  type?: InputType
  value: string
  onChange: (value: string) => void
  onValidChange?: (isValid: boolean) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
  validation?: ValidationRule[]
  showPasswordToggle?: boolean
  className?: string
  id?: string
  name?: string
  autoComplete?: string
}

export default function FormInput({
  type = 'text',
  value,
  onChange,
  onValidChange,
  label,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  validation = [],
  showPasswordToggle = false,
  className,
  id,
  name,
  autoComplete,
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [touched, setTouched] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)

  const inputId = id || `input-${name || type}`

  // Built-in validation rules
  const builtInValidation: Record<InputType, ValidationRule[]> = {
    text: [],
    tel: [],
    url: [
      {
        validate: (val) => /^https?:\/\/.+/.test(val),
        message: 'Please enter a valid URL (starting with http:// or https://)',
      },
    ],
    email: [
      {
        validate: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        message: 'Please enter a valid email address',
      },
    ],
    password: [
      {
        validate: (val) => val.length >= 8,
        message: 'Password must be at least 8 characters',
      },
      {
        validate: (val) => /[A-Z]/.test(val),
        message: 'Password must contain at least one uppercase letter',
      },
      {
        validate: (val) => /[a-z]/.test(val),
        message: 'Password must contain at least one lowercase letter',
      },
      {
        validate: (val) => /[0-9]/.test(val),
        message: 'Password must contain at least one number',
      },
    ],
    number: [
      {
        validate: (val) => !isNaN(Number(val)),
        message: 'Please enter a valid number',
      },
    ],
  }

  // Combine built-in and custom validation
  const allValidation = [...builtInValidation[type], ...validation]

  // Validate input
  const validateInput = (val: string): boolean => {
    if (!required && !val) {
      setValidationErrors([])
      return true
    }

    if (required && !val) {
      setValidationErrors(['This field is required'])
      return false
    }

    const errors: string[] = []
    allValidation.forEach(rule => {
      if (!rule.validate(val)) {
        errors.push(rule.message)
      }
    })

    setValidationErrors(errors)
    return errors.length === 0
  }

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Real-time validation (only if touched)
    if (touched) {
      const valid = validateInput(newValue)
      setIsValid(valid)
      onValidChange?.(valid)
    }
  }

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false)
    setTouched(true)

    // Validate on blur
    const valid = validateInput(value)
    setIsValid(valid)
    onValidChange?.(valid)
  }

  // Update validation when value changes externally
  useEffect(() => {
    if (touched && value) {
      const valid = validateInput(value)
      setIsValid(valid)
      onValidChange?.(valid)
    } else if (!value) {
      setIsValid(null)
      setValidationErrors([])
    }
  }, [value, touched]) // eslint-disable-line react-hooks/exhaustive-deps

  // Determine input type (for password toggle)
  const inputType = type === 'password' && showPassword ? 'text' : type

  // Validation state
  const showValidation = touched && value.length > 0
  const showError = error || (showValidation && isValid === false)
  const showSuccess = showValidation && isValid === true && !error

  // Password strength indicator
  const getPasswordStrength = (val: string): { strength: number; label: string; color: string } => {
    if (type !== 'password') return { strength: 0, label: '', color: '' }

    let strength = 0
    if (val.length >= 8) strength++
    if (/[A-Z]/.test(val)) strength++
    if (/[a-z]/.test(val)) strength++
    if (/[0-9]/.test(val)) strength++
    if (/[^A-Za-z0-9]/.test(val)) strength++

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-error-500' }
    if (strength === 3) return { strength, label: 'Fair', color: 'bg-warning-500' }
    if (strength === 4) return { strength, label: 'Good', color: 'bg-success-500' }
    return { strength, label: 'Strong', color: 'bg-success-600' }
  }

  const passwordStrength = getPasswordStrength(value)

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-error-500 ml-1" aria-label="required">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <input
          type={inputType}
          id={inputId}
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          aria-required={required}
          className={cn(
            'w-full px-4 py-3 min-h-[44px]',
            'bg-white/5 backdrop-blur-xl',
            'border rounded-lg',
            'text-white placeholder-gray-400',
            'transition-all duration-normal',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
            (showPasswordToggle || showValidation) && 'pr-12',
            disabled && 'opacity-50 cursor-not-allowed',
            showError && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
            showSuccess && 'border-success-500 focus:border-success-500 focus:ring-success-500/20',
            !showError && !showSuccess && 'border-white/10 focus:border-primary-500 focus:ring-primary-500/20'
          )}
        />

        {/* Right Side Icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {/* Password Toggle */}
          {type === 'password' && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={0}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          )}

          {/* Validation Icon */}
          {!showPasswordToggle && (
            <div className="pointer-events-none">
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
          )}
        </div>
      </div>

      {/* Password Strength Indicator */}
      {type === 'password' && value.length > 0 && showValidation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                className={cn('h-full transition-all duration-normal', passwordStrength.color)}
              />
            </div>
            <span className={cn('text-xs font-medium', passwordStrength.color.replace('bg-', 'text-'))}>
              {passwordStrength.label}
            </span>
          </div>
        </motion.div>
      )}

      {/* Error Messages */}
      <AnimatePresence>
        {showError && (
          <motion.div
            id={`${inputId}-error`}
            role="alert"
            aria-live="polite"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-2 space-y-1"
          >
            {(error ? [error] : validationErrors).map((err, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-error-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{err}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      {!showError && helperText && (
        <p id={`${inputId}-helper`} className="mt-2 text-xs text-gray-400">
          {helperText}
        </p>
      )}

      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && !helperText && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex items-center gap-2 text-sm text-success-400"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>Looks good!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

