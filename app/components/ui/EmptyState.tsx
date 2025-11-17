'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  iconColor?: string // Business primary color
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  className = '',
  iconColor
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
    >
      <div
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-4',
          iconColor 
            ? `bg-${iconColor}/10 border border-${iconColor}/30`
            : 'bg-slate-800/50 border border-slate-700/50'
        )}
        style={iconColor ? { backgroundColor: `${iconColor}10`, borderColor: `${iconColor}30` } : undefined}
      >
        <Icon
          className={cn(
            'w-8 h-8',
            iconColor ? `text-${iconColor}` : 'text-slate-400'
          )}
          style={iconColor ? { color: iconColor } : undefined}
        />
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">
        {title}
      </h3>
      
      <p className="text-slate-400 text-sm mb-6 max-w-md">
        {message}
      </p>
      
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="px-6 py-2"
          style={iconColor ? { backgroundColor: iconColor } : undefined}
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  )
}

