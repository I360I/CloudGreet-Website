'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  illustration?: React.ReactNode
  className?: string
}

export default function EmptyStateComponent({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  illustration,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 md:p-12',
        className
      )}
    >
      {/* Icon or Illustration */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-6"
      >
        {illustration ? (
          illustration
        ) : Icon ? (
          <div className="w-20 h-20 rounded-full bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
            <Icon className="w-10 h-10 text-gray-400" aria-hidden="true" />
          </div>
        ) : null}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-xl md:text-2xl font-bold text-white mb-3"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-gray-400 max-w-md mb-8"
      >
        {description}
      </motion.p>

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              size="lg"
              variant="default"
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              size="lg"
              variant="outline"
              className="border-gray-700 hover:bg-gray-800 text-gray-300"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

// Pre-built empty state illustrations (simple SVGs)
export const EmptyIllustrations = {
  NoCalls: () => (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="opacity-50"
    >
      <circle cx="60" cy="60" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
      <path
        d="M45 50C45 50 48 45 52 45C56 45 60 48 60 53C60 58 55 62 60 65C65 68 70 65 70 60"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="60" cy="73" r="2" fill="currentColor" />
    </svg>
  ),
  NoAppointments: () => (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="opacity-50"
    >
      <rect x="30" y="30" width="60" height="60" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M40 30 L40 20 M80 30 L80 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 45 L90 45" stroke="currentColor" strokeWidth="2" />
      <circle cx="45" cy="60" r="3" fill="currentColor" />
      <circle cx="60" cy="60" r="3" fill="currentColor" />
      <circle cx="75" cy="60" r="3" fill="currentColor" />
      <circle cx="45" cy="75" r="3" fill="currentColor" />
      <circle cx="60" cy="75" r="3" fill="currentColor" />
    </svg>
  ),
  NoData: () => (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="opacity-50"
    >
      <path
        d="M30 80 L40 60 L50 70 L60 40 L70 55 L80 35 L90 50"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 4"
      />
      <path d="M20 85 L100 85" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 85 L20 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Search: () => (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="opacity-50"
    >
      <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="2" />
      <path d="M68 68 L85 85" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 50 L58 50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

