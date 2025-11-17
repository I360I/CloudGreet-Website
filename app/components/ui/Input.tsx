'use client'

import React from 'react'
import { useBusinessData } from '@/app/hooks/useBusinessData'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  const { theme } = useBusinessData()
  const primaryColor = theme?.primaryColor || '#8b5cf6'

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all ${className}`}
        style={{ 
          '--tw-ring-color': primaryColor + '50',
          '--tw-border-color': primaryColor + '50'
        } as React.CSSProperties & { '--tw-ring-color'?: string; '--tw-border-color'?: string }}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
