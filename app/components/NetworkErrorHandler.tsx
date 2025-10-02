'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'

interface NetworkErrorHandlerProps {
  children: React.ReactNode
}

export default function NetworkErrorHandler({ children }: NetworkErrorHandlerProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [showRetry, setShowRetry] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowRetry(false)
      setRetryCount(0)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowRetry(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial status
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    window.location.reload()
  }

  return (
    <>
      {children}
      
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 text-center"
          >
            <div className="flex items-center justify-center gap-3">
              <WifiOff className="w-5 h-5" />
              <span className="font-medium">No internet connection</span>
              <button
                onClick={handleRetry}
                className="ml-4 px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-sm flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRetry && isOnline && retryCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white p-4 text-center"
          >
            <div className="flex items-center justify-center gap-3">
              <Wifi className="w-5 h-5" />
              <span className="font-medium">Connection restored!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
