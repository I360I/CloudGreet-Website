'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  height?: string
  width?: string
  rounded?: boolean
}

export function Skeleton({ className = '', height = 'h-4', width = 'w-full', rounded = true }: SkeletonProps) {
  return (
    <div 
      className={`bg-gray-700/50 animate-pulse ${height} ${width} ${rounded ? 'rounded' : ''} ${className}`}
    />
  )
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-gray-700/50 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-700/50 rounded w-1/2 mb-6"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700/50 rounded w-full"></div>
          <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
          <div className="h-4 bg-gray-700/50 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  )
}

export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-gray-700/50 rounded w-1/3 mb-4"></div>
        <div className="h-48 bg-gray-700/50 rounded-lg mb-4"></div>
        <div className="flex justify-between">
          <div className="h-3 bg-gray-700/50 rounded w-16"></div>
          <div className="h-3 bg-gray-700/50 rounded w-16"></div>
          <div className="h-3 bg-gray-700/50 rounded w-16"></div>
        </div>
      </div>
    </div>
  )
}

export function HeatmapSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-gray-700/50 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-8 gap-2 mb-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-700/50 rounded"></div>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-2">
          {[...Array(56)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-700/50 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CallPlayerSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-gray-700/50 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-700/50 rounded w-1/3 mb-6"></div>
        
        {/* Player controls */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gray-700/50 rounded-full"></div>
          <div className="flex-grow h-2 bg-gray-700/50 rounded"></div>
          <div className="h-4 bg-gray-700/50 rounded w-12"></div>
        </div>
        
        {/* Transcript */}
        <div className="space-y-3">
          <div className="h-4 bg-gray-700/50 rounded w-full"></div>
          <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
          <div className="h-4 bg-gray-700/50 rounded w-4/6"></div>
          <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  )
}

export function InsightsSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-gray-700/50 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800/50 p-4 rounded-lg">
              <div className="h-5 bg-gray-700/50 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-700/50 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-700/50 rounded w-4/5"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl p-6 ${className}`}>
      <div className="animate-pulse">
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-700/50 rounded"></div>
          ))}
        </div>
        {/* Rows */}
        <div className="space-y-3">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-700/50 rounded"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

