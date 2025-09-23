import crypto from 'crypto'

// Generate CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Verify CSRF token
export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) {
    return false
  }
  
  // Use crypto.timingSafeEqual for constant-time comparison
  const tokenBuffer = Buffer.from(token, 'hex')
  const sessionBuffer = Buffer.from(sessionToken, 'hex')
  
  if (tokenBuffer.length !== sessionBuffer.length) {
    return false
  }
  
  return crypto.timingSafeEqual(tokenBuffer, sessionBuffer)
}

// Middleware to add CSRF protection
export function withCSRF(handler: Function) {
  return async (request: Request) => {
    const method = request.method
    
    // Only protect state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const token = request.headers.get('x-csrf-token')
      const sessionToken = request.headers.get('x-session-token')
      
      if (!token || !sessionToken || !verifyCSRFToken(token, sessionToken)) {
        return new Response(
          JSON.stringify({ error: 'Invalid CSRF token' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }
    
    return handler(request)
  }
}
