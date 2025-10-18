'use client'

import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient'
  hover?: boolean
  children: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', hover = true, className = '', children, ...props }, ref) => {
    const baseClasses = 'rounded-xl border transition-all duration-200'
    
    const variants = {
      default: 'bg-white border-gray-200 shadow-md',
      elevated: 'bg-white border-gray-200 shadow-xl',
      outlined: 'bg-white border-2 border-gray-300 shadow-none',
      gradient: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-md'
    }
    
    const hoverClasses = hover 
      ? 'hover:shadow-lg hover:-translate-y-1' 
      : ''
    
    const classes = `${baseClasses} ${variants[variant]} ${hoverClasses} ${className}`
    
    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card subcomponents
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`p-6 pb-4 ${className}`} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`p-6 ${className}`} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-4 ${className}`} {...props} />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardContent, CardFooter }
