'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccessibleModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  className?: string
}

export default function AccessibleModal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Focus trap
  const focusableElements = useRef<HTMLElement[]>([])

  // Store previously focused element
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }
  }, [open])

  // Focus management
  useEffect(() => {
    if (open && modalRef.current) {
      // Get all focusable elements
      const getFocusableElements = () => {
        if (!modalRef.current) return []
        const elements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        return Array.from(elements).filter(el => !el.hasAttribute('disabled'))
      }

      focusableElements.current = getFocusableElements()

      // Focus first element or close button
      const firstFocusable = focusableElements.current[0]
      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 100)
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden'

      return () => {
        // Restore body scroll
        document.body.style.overflow = 'unset'

        // Restore focus to previously focused element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus()
        }
      }
    }
  }, [open])

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose()
    }
  }, [onClose, closeOnEscape])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open, handleEscape])

  // Focus trap - handle Tab key
  const handleTab = useCallback((e: KeyboardEvent) => {
    if (!open || e.key !== 'Tab') return

    const elements = focusableElements.current
    if (elements.length === 0) return

    const firstElement = elements[0]
    const lastElement = elements[elements.length - 1]

    if (e.shiftKey) {
      // Shift + Tab - going backwards
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      }
    } else {
      // Tab - going forwards
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }
  }, [open])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleTab)
      return () => document.removeEventListener('keydown', handleTab)
    }
  }, [open, handleTab])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  // Size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal-backdrop"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-modal overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={description ? 'modal-description' : undefined}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                ref={modalRef}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'relative w-full bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden',
                  sizeClasses[size],
                  className
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-800">
                  <div className="flex-1">
                    <h2 id="modal-title" className="text-2xl font-bold text-white">
                      {title}
                    </h2>
                    {description && (
                      <p id="modal-description" className="mt-2 text-sm text-gray-400">
                        {description}
                      </p>
                    )}
                  </div>
                  
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="ml-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {children}
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

