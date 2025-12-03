'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: {
    value: number // Percentage change
    direction: 'up' | 'down'
    label?: string
  }
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  loading?: boolean
  onClick?: () => void
  className?: string
}

export default function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'primary',
  loading = false,
  onClick,
  className,
}: KPICardProps) {
  const colorConfig = {
    primary: {
      gradient: 'from-primary-600/10 to-primary-700/10',
      border: 'border-primary-500/20',
      iconBg: 'bg-primary-500',
      text: 'text-primary-400',
      glow: 'from-primary-500/20 to-primary-600/20',
    },
    secondary: {
      gradient: 'from-secondary-600/10 to-secondary-700/10',
      border: 'border-secondary-500/20',
      iconBg: 'bg-secondary-500',
      text: 'text-secondary-400',
      glow: 'from-secondary-500/20 to-secondary-600/20',
    },
    success: {
      gradient: 'from-success-600/10 to-success-700/10',
      border: 'border-success-500/20',
      iconBg: 'bg-success-500',
      text: 'text-success-400',
      glow: 'from-success-500/20 to-success-600/20',
    },
    warning: {
      gradient: 'from-warning-600/10 to-warning-700/10',
      border: 'border-warning-500/20',
      iconBg: 'bg-warning-500',
      text: 'text-warning-400',
      glow: 'from-warning-500/20 to-warning-600/20',
    },
    error: {
      gradient: 'from-error-600/10 to-error-700/10',
      border: 'border-error-500/20',
      iconBg: 'bg-error-500',
      text: 'text-error-400',
      glow: 'from-error-500/20 to-error-600/20',
    },
    info: {
      gradient: 'from-info-600/10 to-info-700/10',
      border: 'border-info-500/20',
      iconBg: 'bg-info-500',
      text: 'text-info-400',
      glow: 'from-info-500/20 to-info-600/20',
    },
  }

  const config = colorConfig[color]

  const Component = onClick ? motion.button : motion.div

  if (loading) {
    return (
      <div className={cn('relative group', className)}>
        <div className="relative bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-gray-700 rounded-xl" />
            <div className="w-8 h-8 bg-gray-700 rounded-lg" />
          </div>
          <div className="h-4 bg-gray-700 rounded mb-4 w-24" />
          <div className="h-10 bg-gray-700 rounded w-32" />
        </div>
      </div>
    )
  }

  return (
    <Component
      whileHover={onClick ? { y: -5, scale: 1.02 } : { y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'relative group',
        onClick && 'cursor-pointer',
        className
      )}
      aria-label={onClick ? `View ${label} details` : undefined}
    >
      {/* Glow effect */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br rounded-xl blur-lg group-hover:blur-xl transition-all duration-slow opacity-50',
        config.glow
      )} />

      {/* Card */}
      <div className={cn(
        'relative bg-gradient-to-br backdrop-blur-sm p-6 rounded-xl border transition-all duration-slow',
        config.gradient,
        config.border,
        'group-hover:border-opacity-40'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {/* Icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg',
            config.iconBg
          )}>
            <Icon className="w-6 h-6 text-white" aria-hidden="true" />
          </div>

          {/* Trend Indicator */}
          {trend && (
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                trend.direction === 'up' ? 'bg-success-500/20' : 'bg-error-500/20'
              )}
            >
              {trend.direction === 'up' ? (
                <TrendingUp className="w-5 h-5 text-success-400" aria-hidden="true" />
              ) : (
                <TrendingDown className="w-5 h-5 text-error-400" aria-hidden="true" />
              )}
            </motion.div>
          )}
        </div>

        {/* Label */}
        <h3 className="text-base font-semibold mb-2 text-gray-300">
          {label}
        </h3>

        {/* Value */}
        <div className="flex items-baseline gap-2">
          <p className="text-4xl md:text-5xl font-bold text-white">
            {value}
          </p>
          {trend && (
            <span className={cn(
              'text-sm font-medium',
              trend.direction === 'up' ? 'text-success-400' : 'text-error-400'
            )}>
              {trend.direction === 'up' ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>

        {/* Trend Label */}
        {trend?.label && (
          <p className="text-sm text-gray-400 mt-2">
            {trend.label}
          </p>
        )}
      </div>
    </Component>
  )
}

