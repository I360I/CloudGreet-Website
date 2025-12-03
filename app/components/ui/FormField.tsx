'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  helperText?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  htmlFor?: string
}

export function FormField({
  label,
  error,
  helperText,
  required = false,
  children,
  className = '',
  htmlFor
}: FormFieldProps) {
  const fieldId = htmlFor || `field-${Math.random().toString(36).substr(2, 9)}`
  const helperTextId = `helper-${fieldId}`
  const errorId = `error-${fieldId}`
  
  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <div className={cn(
        error && 'animate-shake'
      )}>
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement, {
              id: fieldId,
              'aria-describedby': error ? errorId : helperText ? helperTextId : undefined,
              'aria-invalid': error ? 'true' : undefined,
              'aria-errormessage': error ? errorId : undefined
            })
          : children}
      </div>
      
      {helperText && !error && (
        <p id={helperTextId} className="text-sm text-slate-400">
          {helperText}
        </p>
      )}
      
      {error && (
        <motion.p
          id={errorId}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

// Add shake animation to global CSS or Tailwind config
// @keyframes shake {
//   0%, 100% { transform: translateX(0); }
//   25% { transform: translateX(-4px); }
//   75% { transform: translateX(4px); }
// }
// .animate-shake {
//   animation: shake 0.3s ease-in-out;
// }

