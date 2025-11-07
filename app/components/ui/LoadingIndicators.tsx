'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface ProgressIndicatorProps {
  progress: number
  total: number
  label?: string
  className?: string
}

export function ProgressIndicator({ progress, total, label, className = '' }: ProgressIndicatorProps) {
  const percentage = Math.min((progress / total) * 100, 100)

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>{label}</span>
          <span>{progress} / {total}</span>
        </div>
      )}
      
      <div className="w-full bg-gray-700 rounded-full h-2">
        <motion.div
          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
    >
      <div className="w-full h-full border-2 border-gray-600 border-t-purple-500 rounded-full" />
    </motion.div>
  )
}

interface LoadingDotsProps {
  className?: string
}

export function LoadingDots({ className = '' }: LoadingDotsProps) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 bg-purple-500 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  )
}

interface LoadingBarProps {
  progress: number
  className?: string
}

export function LoadingBar({ progress, className = '' }: LoadingBarProps) {
  return (
    <div className={`w-full bg-gray-700 rounded-full h-1 ${className}`}>
      <motion.div
        className="bg-gradient-to-r from-purple-500 to-blue-500 h-1 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(progress, 100)}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}

interface LoadingPulseProps {
  className?: string
}

export function LoadingPulse({ className = '' }: LoadingPulseProps) {
  return (
    <motion.div
      className={`bg-gray-700 rounded ${className}`}
      animate={{
        opacity: [0.5, 1, 0.5]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  )
}

interface LoadingSkeletonProps {
  lines?: number
  className?: string
}

export function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <LoadingPulse
          key={index}
          className={`h-4 ${index === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  className?: string
}

export function LoadingOverlay({ isLoading, children, className = '' }: LoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <motion.div
          className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-300 text-sm">Loading...</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

interface LoadingButtonProps {
  isLoading: boolean
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}

export function LoadingButton({ 
  isLoading, 
  children, 
  className = '', 
  onClick, 
  disabled = false 
}: LoadingButtonProps) {
  return (
    <motion.button
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        disabled || isLoading
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : 'bg-purple-600 hover:bg-purple-700 text-white'
      } ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? { scale: 1.05 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.95 } : {}}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  )
}

