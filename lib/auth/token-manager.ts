/**
 * Secure token management utility
 * Uses httpOnly cookies for token storage to prevent XSS attacks
 */

'use client'

/**
 * Set authentication token in httpOnly cookie
 * This must be done server-side via API route
 */
export async function setAuthToken(token: string): Promise<void> {
  // Call API route to set httpOnly cookie
  await fetch('/api/auth/set-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
    credentials: 'include',
  })
}

// Token cache to avoid multiple API calls
let tokenCache: { token: string | null; timestamp: number } | null = null
const TOKEN_CACHE_TTL = 60000 // 1 minute cache

/**
 * Get authentication token
 * First tries cookie (via API), falls back to localStorage for migration
 * Includes caching to avoid multiple API calls
 */
export async function getAuthToken(): Promise<string | null> {
  // Check cache first (if less than 1 minute old)
  if (tokenCache && Date.now() - tokenCache.timestamp < TOKEN_CACHE_TTL) {
    return tokenCache.token
  }

  try {
    // Try to get token from secure cookie via API
    const response = await fetch('/api/auth/get-token', {
      credentials: 'include',
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.token) {
        // Cache the token
        tokenCache = { token: data.token, timestamp: Date.now() }
        
        // Migrate from localStorage if exists
        const oldToken = localStorage.getItem('token')
        if (oldToken && oldToken !== data.token) {
          localStorage.removeItem('token')
        }
        return data.token
      }
    }
  } catch (error) {
    // Fallback to localStorage during migration
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      if (token) {
        // Cache the token
        tokenCache = { token, timestamp: Date.now() }
        return token
      }
    }
  }
  
  // Clear cache if no token found
  tokenCache = { token: null, timestamp: Date.now() }
  return null
}

/**
 * Clear token cache (useful after logout or token refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null
}

/**
 * Clear authentication token
 */
export async function clearAuthToken(): Promise<void> {
  // Remove from localStorage (migration cleanup)
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('business')
  }
  
  // Clear httpOnly cookie via API
  await fetch('/api/auth/clear-token', {
    method: 'POST',
    credentials: 'include',
  })
}

/**
 * Get token synchronously (for immediate use)
 * Uses localStorage as fallback during migration
 */
export function getAuthTokenSync(): string | null {
  if (typeof window === 'undefined') return null
  // Check both 'token' and 'auth_token' for compatibility
  return localStorage.getItem('token') || localStorage.getItem('auth_token')
}

