import { randomBytes } from 'crypto'

export interface CSRFToken {
  token: string
  timestamp: number
  expires: number
}

// In-memory store for CSRF tokens (in production, use Redis or database)
const csrfTokens = new Map<string, CSRFToken>()

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now()
  csrfTokens.forEach((token, key) => {
    if (token.expires < now) {
      csrfTokens.delete(key)
    }
  })
}, 5 * 60 * 1000)

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(sessionId?: string): string {
  const token = randomBytes(32).toString('hex')
  const now = Date.now()
  const expires = now + (60 * 60 * 1000) // 1 hour expiration

  const csrfToken: CSRFToken = {
    token,
    timestamp: now,
    expires
  }

  // Store token with session ID or random key
  const key = sessionId || `anonymous_${now}_${Math.random()}`
  csrfTokens.set(key, csrfToken)

  return token
}

/**
 * Verify a CSRF token
 */
export function verifyCSRFToken(token: string, sessionId?: string): boolean {
  if (!token) return false

  // Find token in store
  let foundToken: CSRFToken | undefined
  const key = sessionId || 'anonymous'
  
  csrfTokens.forEach((storedToken, storedKey) => {
    if (storedToken.token === token) {
      // If we have a session ID, make sure it matches
      if (sessionId && !storedKey.includes(sessionId)) {
        return
      }
      foundToken = storedToken
    }
  })

  if (!foundToken) return false

  // Check if token is expired
  if (foundToken.expires < Date.now()) {
    return false
  }

  return true
}

/**
 * Get CSRF token from request headers or body
 */
export function getCSRFTokenFromRequest(request: Request): string | null {
  // Try header first
  const headerToken = request.headers.get('x-csrf-token')
  if (headerToken) return headerToken

  // Try form data
  const contentType = request.headers.get('content-type')
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    return null // Will be handled by form data parsing
  }

  return null
}

/**
 * Middleware for CSRF protection
 */
export function csrfMiddleware() {
  return async (request: Request) => {
    const method = request.method.toUpperCase()
    
    // Only protect state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return { success: true }
    }

    // Skip CSRF for API routes that use other authentication
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/') && url.pathname.includes('/webhook')) {
      return { success: true }
    }

    // Get session ID from cookie or header
    const sessionId = request.headers.get('x-session-id') || 
                     request.headers.get('cookie')?.split(';')
                       .find(c => c.trim().startsWith('sessionId='))
                       ?.split('=')[1]

    // Get CSRF token
    const token = getCSRFTokenFromRequest(request)
    
    if (!token || !verifyCSRFToken(token, sessionId)) {
      return {
        success: false,
        error: 'Invalid CSRF token',
        status: 403
      }
    }

    return { success: true }
  }
}

/**
 * Generate CSRF token for forms
 */
export function getCSRFTokenForForm(sessionId?: string): string {
  return generateCSRFToken(sessionId)
}

/**
 * CSRF token component for forms
 */
export function CSRFTokenInput({ token }: { token: string }) {
  return `<!-- CSRF Token: ${token} -->`
}

export default {
  generateCSRFToken,
  verifyCSRFToken,
  getCSRFTokenFromRequest,
  csrfMiddleware,
  getCSRFTokenForForm,
  CSRFTokenInput
}
