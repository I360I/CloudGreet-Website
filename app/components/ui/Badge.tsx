'use client'

import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center font-semibold rounded-full border'
    
    const variants = {
      primary: 'badge-primary bg-blue-50 text-blue-700 border-blue-200',
      success: 'badge-success bg-green-50 text-green-700 border-green-200',
      warning: 'badge-warning bg-yellow-50 text-yellow-700 border-yellow-200',
      error: 'badge-error bg-red-50 text-red-700 border-red-200',
      info: 'bg-gray-50 text-gray-700 border-gray-200'
    }
    
    const sizes = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-2 text-base'
    }
    
    const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`
    
    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
export default Badge
