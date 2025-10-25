'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'

interface NetworkErrorHandlerProps {
  error?: string
  onRetry?: () => void
  isVisible?: boolean
}

export default function NetworkErrorHandler({ 
  error = 'Network connection lost', 
  onRetry,
  isVisible = true 
}: NetworkErrorHandlerProps) {
  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-50 max-w-sm"
    >
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <WifiOff className="w-4 h-4 text-red-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-red-400 text-sm">Connection Lost</h4>
            <p className="text-red-300 text-xs mt-1">{error}</p>
            
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 border border-red-400/30 text-red-300 text-xs rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
