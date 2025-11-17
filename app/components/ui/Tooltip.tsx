'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 500,
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showTimeout, setShowTimeout] = useState<NodeJS.Timeout | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({})

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setIsVisible(true)
      adjustPosition()
    }, delay)
    setShowTimeout(timeout)
  }

  const handleMouseLeave = () => {
    if (showTimeout) {
      clearTimeout(showTimeout)
      setShowTimeout(null)
    }
    setIsVisible(false)
  }

  const adjustPosition = () => {
    if (!tooltipRef.current) return

    const rect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Auto-adjust if tooltip would go off-screen
    let adjustedPosition = position
    const positionMap: Record<string, { top?: number; bottom?: number; left?: number; right?: number }> = {}

    if (position === 'top' && rect.top < 0) {
      adjustedPosition = 'bottom'
    } else if (position === 'bottom' && rect.bottom > viewportHeight) {
      adjustedPosition = 'top'
    } else if (position === 'left' && rect.left < 0) {
      adjustedPosition = 'right'
    } else if (position === 'right' && rect.right > viewportWidth) {
      adjustedPosition = 'left'
    }

    // Set position styles
    switch (adjustedPosition) {
      case 'top':
        positionMap.bottom = 100
        break
      case 'bottom':
        positionMap.top = 100
        break
      case 'left':
        positionMap.right = 100
        break
      case 'right':
        positionMap.left = 100
        break
    }

    setTooltipPosition(positionMap)
  }

  useEffect(() => {
    if (isVisible) {
      adjustPosition()
    }
  }, [isVisible, position])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'absolute z-50 px-3 py-2 text-xs text-white bg-slate-900 border border-blue-500/30 rounded-lg shadow-lg whitespace-nowrap',
              positionClasses[position],
              className
            )}
            style={tooltipPosition}
            role="tooltip"
          >
            {content}
            {/* Arrow */}
            <div
              className={cn(
                'absolute w-2 h-2 bg-slate-900 border border-blue-500/30 rotate-45',
                position === 'top' && 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-t-0 border-l-0',
                position === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-b-0 border-r-0',
                position === 'left' && 'left-full top-1/2 -translate-y-1/2 translate-x-1/2 border-l-0 border-b-0',
                position === 'right' && 'right-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-r-0 border-t-0'
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

