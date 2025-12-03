'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  htmlFor?: string
}

export function FormField({
  label,
  error,
  required = false,
  children,
  className = '',
  htmlFor
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <div className={cn(
        error && 'animate-shake'
      )}>
        {children}
      </div>
      
      {error && (
        <motion.p
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

