// Store session data for SSE connections
const sessionData = new Map<string, any>()

// Helper function to send messages to SSE clients
export function sendToSession(sessionId: string, message: any) {
  const session = sessionData.get(sessionId)
  if (session) {
    try {
      session.controller.enqueue(session.encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
    } catch (error) {
      console.error('❌ Error sending to session:', error)
    }
  }
}

// Helper function to store session data
export function storeSession(sessionId: string, controller: any, encoder: any) {
  sessionData.set(sessionId, { controller, encoder })
}

// Helper function to remove session data
export function removeSession(sessionId: string) {
  sessionData.delete(sessionId)
}
