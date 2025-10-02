'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'

interface VirtualScrollProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number
  onScroll?: (scrollTop: number) => void
}

export default function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5,
  onScroll
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length - 1
    )
    
    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex
    }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.startIndex * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  // Smooth scroll to top when items change
  useEffect(() => {
    if (scrollElementRef.current && items.length === 0) {
      scrollElementRef.current.scrollTop = 0
      setScrollTop(0)
    }
  }, [items.length])

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index
            return (
              <motion.div
                key={actualIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                style={{ height: itemHeight }}
                className="flex items-center"
              >
                {renderItem(item, actualIndex)}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
