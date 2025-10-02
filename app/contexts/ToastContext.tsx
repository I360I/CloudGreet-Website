'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { ToastContainer, ToastProps } from '../components/Toast'

interface ToastContextType {
  showToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
  showWarning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const showToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substring(7)
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
      }
    }
    setToasts(prev => [...prev, newToast])
  }, [])

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message })
  }, [showToast])

  const showError = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message })
  }, [showToast])

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message })
  }, [showToast])

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message })
  }, [showToast])

  const closeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
