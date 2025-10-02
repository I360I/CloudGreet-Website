'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wifi, WifiOff, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking')
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkConnection = async () => {
    try {
      setStatus('checking')
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache'
      })
      
      if (response.ok) {
        setStatus('connected')
      } else {
        setStatus('error')
      }
    } catch (error) {
      setStatus('disconnected')
    } finally {
      setLastChecked(new Date())
    }
  }

  useEffect(() => {
    checkConnection()
    const interval = setInterval(checkConnection, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin" />
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-red-400" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking...'
      case 'connected':
        return 'Connected'
      case 'disconnected':
        return 'Offline'
      case 'error':
        return 'Service Error'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'text-gray-400'
      case 'connected':
        return 'text-green-400'
      case 'disconnected':
        return 'text-red-400'
      case 'error':
        return 'text-yellow-400'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1 bg-black/20 backdrop-blur-sm rounded-lg border border-white/10"
    >
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {lastChecked && (
        <span className="text-xs text-gray-500 ml-1">
          {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      <button
        onClick={checkConnection}
        className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
        title="Refresh connection status"
      >
        <motion.div
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.3 }}
        >
          <Wifi className="w-3 h-3 text-gray-400" />
        </motion.div>
      </button>
    </motion.div>
  )
}
