'use client'

import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

interface FormFieldProps {
  label: string
  type: 'text' | 'email' | 'password' | 'tel' | 'textarea'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  success?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  validation?: (value: string) => { isValid: boolean; error?: string }
}

export default function FormField({
  label,
  type,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  success = false,
  disabled = false,
  icon,
  validation
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [validationError, setValidationError] = useState<string>('')

  const handleChange = (newValue: string) => {
    onChange(newValue)
    
    if (validation) {
      const result = validation(newValue)
      setValidationError(result.isValid ? '' : result.error || '')
    }
  }

  const displayError = error || validationError
  const hasError = !!displayError
  const hasSuccess = success && !hasError && value.length > 0

  const inputClasses = `
    w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-500 
    focus:outline-none transition-all duration-300
    ${icon ? 'pl-12' : ''}
    ${type === 'password' ? 'pr-12' : ''}
    ${hasError 
      ? 'border-red-500 ring-2 ring-red-500/20' 
      : hasSuccess 
        ? 'border-green-500 ring-2 ring-green-500/20'
        : isFocused 
          ? 'border-blue-500 ring-2 ring-blue-500/20' 
          : 'border-gray-300 hover:border-gray-400'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
  `

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={4}
            className={inputClasses}
          />
        ) : (
          <input
            type={type === 'password' && showPassword ? 'text' : type}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={inputClasses}
          />
        )}
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
        
        {hasSuccess && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
        )}
      </div>
      
      {hasError && (
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  )
}
