'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'white' | 'gray'
  className?: string
  text?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
  text
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const colorClasses = {
    primary: 'text-blue-500',
    white: 'text-white',
    gray: 'text-gray-400'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 
          className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}
          aria-hidden="true"
        />
        {text && (
          <p className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}>
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

// Full screen loading overlay
export const LoadingOverlay: React.FC<{
  isLoading: boolean
  text?: string
  className?: string
}> = ({ isLoading, text = 'Loading...', className = '' }) => {
  if (!isLoading) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm ${className}`}>
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-8 shadow-2xl">
        <LoadingSpinner size="xl" color="white" text={text} />
      </div>
    </div>
  )
}

// Inline loading component
export const InlineLoader: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'white' | 'gray'
  className?: string
}> = ({ size = 'sm', color = 'gray', className = '' }) => (
  <LoadingSpinner size={size} color={color} className={className} />
)

export default LoadingSpinner
