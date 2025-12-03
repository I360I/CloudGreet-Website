'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  progress?: number // 0-100
  fullScreen?: boolean
  className?: string
}

export default function LoadingState({
  size = 'md',
  text,
  progress,
  fullScreen = false,
  className,
}: LoadingStateProps) {
  const sizeConfig = {
    sm: { spinner: 'w-6 h-6', text: 'text-sm', container: 'gap-2' },
    md: { spinner: 'w-10 h-10', text: 'text-base', container: 'gap-3' },
    lg: { spinner: 'w-16 h-16', text: 'text-lg', container: 'gap-4' },
  }

  const config = sizeConfig[size]

  const content = (
    <div className={cn('flex flex-col items-center justify-center', config.container, className)}>
      {/* Spinner */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={cn(config.spinner, 'text-primary-500')}
        role="status"
        aria-label="Loading"
      >
        <Loader2 className="w-full h-full" aria-hidden="true" />
      </motion.div>

      {/* Loading Text */}
      {text && (
        <p className={cn(config.text, 'text-gray-300 font-medium')}>
          {text}
        </p>
      )}

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
            />
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-modal">
        {content}
      </div>
    )
  }

  return content
}

// Inline loading spinner (for buttons)
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={cn('inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full', className)}
      role="status"
      aria-label="Loading"
    />
  )
}

// Skeleton loader with shimmer effect
export function SkeletonShimmer({ 
  width = '100%', 
  height = 20, 
  className,
  rounded = 'md' 
}: { 
  width?: string | number
  height?: string | number
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}) {
  const roundedClasses = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-800',
        roundedClasses[rounded],
        className
      )}
      style={{ width, height }}
      role="status"
      aria-label="Loading"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/50 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

// Loading dots animation
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-1', className)} role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-primary-500 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

