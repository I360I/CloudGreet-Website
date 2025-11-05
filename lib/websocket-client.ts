import { logger } from '@/lib/monitoring'
import type { WebSocketMessage } from '@/lib/types/common'

export class DashboardWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private businessId: string = ''
  private onUpdateCallback: ((data: WebSocketMessage) => void) | null = null

  /**

   * connect - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.connect(param1, param2)

   * ```

   */

  connect(businessId: string, onUpdate: (data: WebSocketMessage) => void) {
    this.businessId = businessId
    this.onUpdateCallback = onUpdate
    
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000"'}/api/websocket/dashboard/${businessId}`
    
    try {
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        logger.info('WebSocket connected')
        this.reconnectAttempts = 0
      }
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (this.onUpdateCallback) {
            this.onUpdateCallback(data)
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', { error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }
      
      this.ws.onclose = (event) => {
        logger.info('WebSocket disconnected:', { code: event.code, reason: event.reason })
        
        /**
        
         * if - Add description here
        
         * 
        
         * @param {...any} args - Method parameters
        
         * @returns {Promise<any>} Method return value
        
         * @throws {Error} When operation fails
        
         * 
        
         * @example
        
         * ```typescript
        
         * await this.if(param1, param2)
        
         * ```
        
         */
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++
            logger.info(`Reconnecting... attempt ${this.reconnectAttempts}`)
            this.connect(this.businessId, this.onUpdateCallback!)
          }, Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000))
        } else {
          logger.error('Max reconnection attempts reached')
        }
      }
      
      this.ws.onerror = (error) => {
        logger.error('WebSocket error:', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      
    } catch (error) {
      logger.error('Failed to create WebSocket connection:', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  /**

   * disconnect - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.disconnect(param1, param2)

   * ```

   */

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(data: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getWebSocket(): WebSocket | null {
    return this.ws
  }
}

// Singleton instance
export const dashboardWebSocket = new DashboardWebSocket()