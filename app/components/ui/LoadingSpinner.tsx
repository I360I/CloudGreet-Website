'use client'

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  text?: string
  className?: string
}

function LoadingSpinner({ 
  size = 'md', 
  color = 'text-blue-500',
  text,
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <div
          className={`${sizeClasses[size]} border-2 border-gray-300 border-t-transparent rounded-full animate-spin ${color}`}
        />
        {text && (
          <p className="text-sm text-gray-500 animate-pulse">{text}</p>
        )}
      </div>
    </div>
  )
}

function LoadingOverlay({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" color="text-white" />
        <p className="text-white font-medium">{text}</p>
      </div>
    </div>
  )
}

function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <LoadingSpinner size="sm" />
      <span className="text-sm text-gray-500">{text}</span>
    </div>
  )
}

export { LoadingSpinner, LoadingOverlay, InlineLoader }
export default LoadingSpinner
