import { logger } from '@/lib/monitoring'
// Store session data for SSE connections
const sessionData = new Map<string, unknown>()

// Helper function to send messages to SSE clients
/**
 * sendToSession - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await sendToSession(param1, param2)
 * ```
 */
export function sendToSession(sessionId: string, message: any) {
  const session = sessionData.get(sessionId)
  if (session) {
    try {
      session.controller.enqueue(session.encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
    } catch (error) {
      logger.error('❌ Error sending to session:', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
}

// Helper function to store session data
/**
 * storeSession - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await storeSession(param1, param2)
 * ```
 */
export function storeSession(sessionId: string, controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  sessionData.set(sessionId, { controller, encoder })
}

// Helper function to remove session data
/**
 * removeSession - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await removeSession(param1, param2)
 * ```
 */
export function removeSession(sessionId: string) {
  sessionData.delete(sessionId)
}
