import { useEffect, useState, useRef } from 'react'
import { dashboardWebSocket } from '@/lib/websocket-client'
import type { WebSocketMessage } from '@/lib/types/common'

interface UseWebSocketOptions {
  businessId: string
  enabled?: boolean
}

export function useWebSocket({ businessId, enabled = true }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!enabled || !businessId) return

    const handleUpdate = (data: WebSocketMessage) => {
      setLastMessage(data)
      setError(null)
    }

    const handleConnect = () => {
      setIsConnected(true)
      setError(null)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleError = (err: Error) => {
      setError(err.message)
      setIsConnected(false)
    }

    // Connect to WebSocket
    dashboardWebSocket.connect(businessId, handleUpdate)

    // Set up event listeners
    const ws = dashboardWebSocket.getWebSocket()
    const originalOnOpen = ws?.onopen
    const originalOnClose = ws?.onclose
    const originalOnError = ws?.onerror

    if (ws) {
      ws.onopen = (event) => {
        handleConnect()
        if (originalOnOpen) {
          originalOnOpen.call(ws, event)
        }
      }

      ws.onclose = (event) => {
        handleDisconnect()
        if (originalOnClose) {
          originalOnClose.call(ws, event)
        }
      }

      ws.onerror = (event) => {
        handleError(new Error('WebSocket connection error'))
        if (originalOnError) {
          originalOnError.call(ws, event)
        }
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      dashboardWebSocket.disconnect()
    }
  }, [businessId, enabled])

  const sendMessage = (data: unknown) => {
    if (isConnected) {
      dashboardWebSocket.send(data)
    }
  }

  const reconnect = () => {
    dashboardWebSocket.disconnect()
    setTimeout(() => {
      dashboardWebSocket.connect(businessId, (data: WebSocketMessage) => setLastMessage(data))
    }, 1000)
  }

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    reconnect
  }
}

// Hook for real-time dashboard metrics
export function useRealtimeMetrics(businessId: string) {
  const [metrics, setMetrics] = useState({
    activeCalls: 0,
    callsToday: 0,
    appointmentsToday: 0,
    revenueToday: 0
  })

  const { lastMessage, isConnected } = useWebSocket({ businessId })

  useEffect(() => {
    if (lastMessage?.type === 'broadcast') {
      const data = lastMessage.data as any
      if (data?.type === 'metrics') {
        setMetrics(prev => ({
          ...prev,
          ...(data.metrics || {})
        }))
      }
    }
  }, [lastMessage])

  return {
    metrics,
    isConnected,
    lastUpdated: lastMessage?.timestamp
  }
}

// Hook for real-time call updates
export function useRealtimeCalls(businessId: string) {
  const [calls, setCalls] = useState<unknown[]>([])
  const [newCall, setNewCall] = useState<any | null>(null)

  const { lastMessage } = useWebSocket({ businessId })

  useEffect(() => {
    if (lastMessage?.type === 'broadcast') {
      const data = lastMessage.data as any
      switch (data?.type) {
        case 'new_call':
          setNewCall(data.call)
          setCalls(prev => [data.call, ...prev])
          break
        case 'call_ended':
          setCalls(prev => prev.map((call: any) => 
            call.id === data.callId 
              ? { ...call, status: 'completed', ...(data.updates || {}) }
              : call
          ))
          break
        case 'call_update':
          setCalls(prev => prev.map((call: any) => 
            call.id === data.callId 
              ? { ...call, ...(data.updates || {}) }
              : call
          ))
          break
      }
    }
  }, [lastMessage])

  return {
    calls,
    newCall,
    lastUpdate: lastMessage?.timestamp
  }
}
