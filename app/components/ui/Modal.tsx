'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  title?: string
  description?: string
  header?: React.ReactNode
  footer?: React.ReactNode
  scrollable?: boolean
  loading?: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
}

const sizeMap = {
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl'
}

export function Modal({ 
  open, 
  title, 
  description, 
  header,
  footer,
  scrollable = false,
  loading = false,
  onClose, 
  children, 
  size = 'lg' 
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      
      // Focus trap
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return
        
        const modal = modalRef.current
        if (!modal) return

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus()
            e.preventDefault()
          }
        }
      }

      // ESC key handler
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)
      document.addEventListener('keydown', handleTab)

      // Focus first element
      setTimeout(() => {
        const modal = modalRef.current
        if (modal) {
          const firstFocusable = modal.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          firstFocusable?.focus()
        }
      }, 100)

      return () => {
        document.body.style.overflow = ''
        document.removeEventListener('keydown', handleEscape)
        document.removeEventListener('keydown', handleTab)
      }
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200,
              duration: 0.3
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
                  className={`relative w-full ${sizeMap[size]} rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-blue-900/30 backdrop-blur-xl flex flex-col max-h-[90vh]`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between px-6 py-5 border-b border-white/5 flex-shrink-0">
                    {header ? (
                      header
                    ) : (
                      <div>
                        {title && (
                          <h3 id="modal-title" className="text-lg font-semibold text-white">
                            {title}
                          </h3>
                        )}
                        {description && (
                          <p id="modal-description" className="mt-1 text-sm text-slate-300">
                            {description}
                          </p>
                        )}
                      </div>
                    )}
                    <motion.button
                      type="button"
                      onClick={onClose}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                      aria-label="Close modal"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </div>

                  {/* Content - Scrollable */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className={cn(
                      'px-6 py-6 flex-1',
                      scrollable && 'overflow-y-auto'
                    )}
                  >
                    {children}
                  </motion.div>

                  {/* Footer */}
                  {footer && (
                    <div className="px-6 py-5 border-t border-white/5 flex-shrink-0">
                      {footer}
                    </div>
                  )}

                  {/* Loading Overlay */}
                  {loading && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-50">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                        <p className="text-sm text-slate-300">Loading...</p>
                      </div>
                    </div>
                  )}
                </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}


