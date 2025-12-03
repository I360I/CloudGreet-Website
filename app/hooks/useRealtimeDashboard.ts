'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useDashboardData } from '@/app/contexts/DashboardDataContext'
import { useToast } from '@/app/contexts/ToastContext'
import { logger } from '@/lib/monitoring'

interface RealtimeDashboardOptions {
  enabled?: boolean
  reconnectInterval?: number
  maxRetries?: number
  fallbackPollingInterval?: number
}

export function useRealtimeDashboard(options: RealtimeDashboardOptions = {}) {
  const {
    enabled = true,
    reconnectInterval = 5000,
    maxRetries = 5,
    fallbackPollingInterval = 30000
  } = options

  const { refreshAll } = useDashboardData()
  const { showError, showInfo } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [retryCount, setRetryCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const connectWebSocket = useCallback(async () => {
    if (!enabled) return

    try {
      // Get business ID from API
      const { fetchWithAuth } = await import('@/lib/auth/fetch-with-auth')
      const response = await fetchWithAuth('/api/dashboard/data')
      if (!response.ok) {
        setConnectionStatus('disconnected')
        return
      }
      
      const data = await response.json()
      const businessId = data.businessId
      if (!businessId) {
        setConnectionStatus('disconnected')
        return
      }

      // Use wss:// for production, ws:// for development
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/realtime?businessId=${businessId}`

      setConnectionStatus('connecting')
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        setRetryCount(0)
        wsRef.current = ws

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000) // 30s heartbeat
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'pong') {
            // Heartbeat response
            return
          }
          
          if (data.type === 'appointment_created' || data.type === 'appointment_updated' || data.type === 'appointment_deleted') {
            // Refresh appointments
            refreshAll({ silent: true })
          }
          
          if (data.type === 'call_received' || data.type === 'call_completed') {
            // Refresh metrics
            refreshAll({ silent: true })
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message', { error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }

      ws.onerror = (error) => {
        logger.error('WebSocket error', { error: error instanceof Error ? error.message : 'Unknown error' })
        setConnectionStatus('error')
        setIsConnected(false)
      }

      ws.onclose = () => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        wsRef.current = null

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }

        // Attempt reconnection with exponential backoff
        if (retryCount < maxRetries) {
          const delay = reconnectInterval * Math.pow(2, retryCount)
          setRetryCount(prev => prev + 1)
          
          reconnectTimerRef.current = setTimeout(() => {
            connectWebSocket()
          }, delay)
        } else {
          // Fallback to polling
          logger.info('WebSocket failed, falling back to polling')
          startPolling()
        }
      }
    } catch (error) {
      logger.error('Failed to connect WebSocket', { error: error instanceof Error ? error.message : 'Unknown error' })
      setConnectionStatus('error')
      setIsConnected(false)
      startPolling()
    }
  }, [enabled, reconnectInterval, maxRetries, retryCount, refreshAll])

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    pollingIntervalRef.current = setInterval(() => {
      refreshAll({ silent: true })
    }, fallbackPollingInterval)
  }, [fallbackPollingInterval, refreshAll])

  useEffect(() => {
    if (enabled) {
      connectWebSocket().catch((error) => {
        logger.error('Failed to connect WebSocket in useEffect', { error: error instanceof Error ? error.message : 'Unknown error' })
      })
    } else {
      // Use polling if WebSocket disabled
      startPolling()
    }

    return () => {
      // Cleanup
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }
  }, [enabled, connectWebSocket, startPolling])

  return {
    isConnected,
    connectionStatus,
    retryCount
  }
}

