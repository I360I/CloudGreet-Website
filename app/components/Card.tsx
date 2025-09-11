'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  shadow?: 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
}

export default function Card({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  hover = false
}: CardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  }
  
  const hoverClasses = hover ? 'hover:shadow-xl transition-shadow duration-300' : ''
  
  const classes = `bg-white rounded-lg border border-gray-200 ${paddingClasses[padding]} ${shadowClasses[shadow]} ${hoverClasses} ${className}`
  
  return (
    <div className={classes}>
      {children}
    </div>
  )
}
