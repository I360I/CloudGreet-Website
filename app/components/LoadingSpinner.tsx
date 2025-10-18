'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  className?: string
}

export default function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4'
      case 'md':
        return 'w-6 h-6'
      case 'lg':
        return 'w-8 h-8'
      case 'xl':
        return 'w-12 h-12'
      default:
        return 'w-6 h-6'
    }
  }

  const getBorderSize = () => {
    switch (size) {
      case 'sm':
        return 'border-2'
      case 'md':
        return 'border-2'
      case 'lg':
        return 'border-4'
      case 'xl':
        return 'border-4'
      default:
        return 'border-2'
    }
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-3">
        <motion.div
          className={`${getSizeClasses()} ${getBorderSize()} border-blue-500/30 border-t-blue-500 rounded-full`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        {text && (
          <p className="text-gray-400 text-sm">{text}</p>
        )}
      </div>
    </div>
  )
}

export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <LoadingSpinner size="xl" text={text} />
      </motion.div>
    </div>
  )
}

export function ButtonLoader({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <LoadingSpinner 
      size={size} 
      className="inline-block"
    />
  )
}
