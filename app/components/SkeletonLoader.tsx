'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular' | 'card'
  width?: string
  height?: string
  count?: number
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular', 
  width = '100%', 
  height = '20px',
  count = 1
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]'
  
  const variantClasses = {
    text: 'rounded h-4',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    card: 'rounded-2xl'
  }

  const skeletonClass = `${baseClasses} ${variantClasses[variant]} ${className}`
  
  const skeletons = Array(count).fill(null).map((_, index) => (
    <div
      key={index}
      className={skeletonClass}
      style={{ 
        width, 
        height, 
        animation: `shimmer 2s ease-in-out infinite`,
        animationDelay: `${index * 0.1}s`
      }}
    />
  ))

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      {count === 1 ? skeletons[0] : <div className="space-y-3">{skeletons}</div>}
    </>
  )
}

// Pre-built skeleton components for common dashboard elements

export function SkeletonMetricCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="circular" width="48px" height="48px" />
        <Skeleton variant="text" width="60px" height="24px" />
      </div>
      <Skeleton variant="text" width="120px" height="16px" className="mb-2" />
      <Skeleton variant="text" width="80px" height="32px" />
    </motion.div>
  )
}

export function SkeletonChart() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width="40px" height="40px" />
          <div>
            <Skeleton variant="text" width="150px" height="20px" className="mb-2" />
            <Skeleton variant="text" width="100px" height="14px" />
          </div>
        </div>
        <Skeleton variant="text" width="60px" height="20px" />
      </div>
      <Skeleton variant="rectangular" width="100%" height="256px" />
    </motion.div>
  )
}

export function SkeletonActivityItem() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
    >
      <Skeleton variant="circular" width="40px" height="40px" />
      <div className="flex-1">
        <Skeleton variant="text" width="60%" height="16px" className="mb-2" />
        <Skeleton variant="text" width="40%" height="12px" />
      </div>
      <Skeleton variant="text" width="60px" height="12px" />
    </motion.div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-white/10">
        <Skeleton variant="text" width="25%" height="16px" />
        <Skeleton variant="text" width="20%" height="16px" />
        <Skeleton variant="text" width="20%" height="16px" />
        <Skeleton variant="text" width="15%" height="16px" />
        <Skeleton variant="text" width="10%" height="16px" />
      </div>

      {/* Rows */}
      {Array(rows).fill(null).map((_, index) => (
        <div key={index} className="flex items-center gap-4 p-4 border-b border-white/5">
          <Skeleton variant="text" width="25%" height="14px" />
          <Skeleton variant="text" width="20%" height="14px" />
          <Skeleton variant="text" width="20%" height="14px" />
          <Skeleton variant="text" width="15%" height="14px" />
          <Skeleton variant="circular" width="24px" height="24px" />
        </div>
      ))}
    </motion.div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white">
      {/* Header Skeleton */}
      <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" width="40px" height="40px" />
              <div>
                <Skeleton variant="text" width="120px" height="24px" className="mb-1" />
                <Skeleton variant="text" width="100px" height="14px" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton variant="rectangular" width="120px" height="40px" />
              <Skeleton variant="rectangular" width="100px" height="40px" />
              <Skeleton variant="circular" width="40px" height="40px" />
            </div>
          </div>
        </div>
      </header>

      {/* Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SkeletonMetricCard />
          <SkeletonMetricCard />
          <SkeletonMetricCard />
        </div>

        {/* Charts */}
        <div className="mb-8">
          <SkeletonChart />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <SkeletonChart />
          <SkeletonChart />
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <Skeleton variant="text" width="200px" height="24px" />
          <SkeletonActivityItem />
          <SkeletonActivityItem />
          <SkeletonActivityItem />
          <SkeletonActivityItem />
        </div>
      </div>
    </div>
  )
}

