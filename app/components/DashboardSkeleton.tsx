'use client'

import React from 'react'
import { motion } from 'framer-motion'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-700/50 rounded-lg w-48 animate-pulse" />
        <div className="h-10 bg-gray-700/50 rounded-lg w-32 animate-pulse" />
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
          >
            <div className="space-y-3">
              <div className="h-4 bg-gray-700/50 rounded w-24 animate-pulse" />
              <div className="h-8 bg-gray-700/50 rounded w-16 animate-pulse" />
              <div className="h-3 bg-gray-700/50 rounded w-20 animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 4) * 0.1 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
          >
            <div className="space-y-4">
              <div className="h-6 bg-gray-700/50 rounded w-32 animate-pulse" />
              <div className="h-64 bg-gray-700/50 rounded animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Feed Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="space-y-4">
          <div className="h-6 bg-gray-700/50 rounded w-40 animate-pulse" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-700/50 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700/50 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-700/50 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
