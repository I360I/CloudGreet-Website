'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  variant?: 'text' | 'circle' | 'rectangle'
}

export function LoadingSkeleton({
  width,
  height,
  className = '',
  variant = 'rectangle'
}: LoadingSkeletonProps) {
  const baseClasses = 'bg-slate-800/50 rounded animate-pulse'
  
  const variantClasses = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rectangle: 'rounded-lg'
  }

  const style: React.CSSProperties = {}
  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width
  }
  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={style}
      aria-label="Loading"
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Shimmer effect variant (more polished)
export function LoadingSkeletonShimmer({
  width,
  height,
  className = '',
  variant = 'rectangle'
}: LoadingSkeletonProps) {
  const baseClasses = 'bg-slate-800/50 rounded relative overflow-hidden'
  
  const variantClasses = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rectangle: 'rounded-lg'
  }

  const style: React.CSSProperties = {}
  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width
  }
  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={style}
      aria-label="Loading"
      role="status"
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Add shimmer animation to global CSS or Tailwind config
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer {
//   animation: shimmer 2s infinite;
// }

