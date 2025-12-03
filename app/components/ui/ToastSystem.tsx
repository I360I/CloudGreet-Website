'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  showWarning: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToastSystem() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastSystem must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000,
    }

    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id)
      }, newToast.duration)
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message })
  }, [showToast])

  const showError = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message })
  }, [showToast])

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message })
  }, [showToast])

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message })
  }, [showToast])

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="fixed top-4 right-4 z-tooltip max-w-md w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, onDismiss, index }: { toast: Toast; onDismiss: (id: string) => void; index: number }) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (toast.duration! / 100))
        return newProgress < 0 ? 0 : newProgress
      })
    }, 100)

    return () => clearInterval(interval)
  }, [toast.duration])

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-success-500/10',
      border: 'border-success-500/30',
      text: 'text-success-400',
      iconColor: 'text-success-500',
      progressBar: 'bg-success-500',
    },
    error: {
      icon: XCircle,
      bg: 'bg-error-500/10',
      border: 'border-error-500/30',
      text: 'text-error-400',
      iconColor: 'text-error-500',
      progressBar: 'bg-error-500',
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-warning-500/10',
      border: 'border-warning-500/30',
      text: 'text-warning-400',
      iconColor: 'text-warning-500',
      progressBar: 'bg-warning-500',
    },
    info: {
      icon: Info,
      bg: 'bg-info-500/10',
      border: 'border-info-500/30',
      text: 'text-info-400',
      iconColor: 'text-info-500',
      progressBar: 'bg-info-500',
    },
  }

  const typeConfig = config[toast.type]
  const Icon = typeConfig.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, y: -20 }}
      animate={{ opacity: 1, x: 0, y: index * 80 }}
      exit={{ opacity: 0, x: 300, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="pointer-events-auto mb-4"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={cn(
          'relative bg-gray-900 backdrop-blur-xl border rounded-lg shadow-xl overflow-hidden',
          typeConfig.border
        )}
      >
        {/* Content */}
        <div className="p-4 flex items-start gap-3">
          {/* Icon */}
          <div className={cn('flex-shrink-0 mt-0.5', typeConfig.iconColor)}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className={cn('font-semibold text-sm mb-1', typeConfig.text)}>
              {toast.title}
            </h3>
            {toast.message && (
              <p className="text-sm text-gray-400">
                {toast.message}
              </p>
            )}

            {/* Action Button */}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick()
                  onDismiss(toast.id)
                }}
                className={cn(
                  'mt-3 text-sm font-medium underline transition-colors',
                  typeConfig.text
                )}
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Progress Bar */}
        {toast.duration && toast.duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
              className={typeConfig.progressBar}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

