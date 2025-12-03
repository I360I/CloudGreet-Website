'use client'

import React, { memo } from 'react'

interface SkeletonLoaderProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  count?: number
  animation?: 'pulse' | 'wave' | 'none'
}

/**
 * Reusable Skeleton Loader Component
 * Provides consistent loading states across the application
 */
const SkeletonLoader = memo(function SkeletonLoader({
  className = '',
  variant = 'rectangular',
  width,
  height,
  count = 1,
  animation = 'pulse'
}: SkeletonLoaderProps) {
  const baseClasses = 'bg-gray-700/50'
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-[shimmer_2s_infinite]',
    none: ''
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  const skeletonElement = (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
      role="status"
      aria-label="Loading"
    >
      {animation === 'wave' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
      )}
    </div>
  )

  if (count === 1) {
    return skeletonElement
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>
          {skeletonElement}
        </React.Fragment>
      ))}
    </div>
  )
})

SkeletonLoader.displayName = 'SkeletonLoader'

export default SkeletonLoader

/**
 * Pre-configured skeleton loaders for common use cases
 */
export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-4">
      <SkeletonLoader variant="rectangular" height={24} width="60%" />
      <SkeletonLoader variant="text" count={3} />
      <SkeletonLoader variant="rounded" height={40} width="40%" />
    </div>
  )
})

SkeletonCard.displayName = 'SkeletonCard'

export const SkeletonTable = memo(function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} variant="text" height={20} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} variant="text" height={16} />
          ))}
        </div>
      ))}
    </div>
  )
})

SkeletonTable.displayName = 'SkeletonTable'

export const SkeletonList = memo(function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <SkeletonLoader variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <SkeletonLoader variant="text" width="70%" />
            <SkeletonLoader variant="text" width="50%" />
          </div>
        </div>
      ))}
    </div>
  )
})

SkeletonList.displayName = 'SkeletonList'
