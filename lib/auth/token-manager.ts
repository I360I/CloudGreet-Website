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

/**
 * Get authentication token
 * First tries cookie (via API), falls back to localStorage for migration
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // Try to get token from secure cookie via API
    const response = await fetch('/api/auth/get-token', {
      credentials: 'include',
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.token) {
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
      return localStorage.getItem('token')
    }
  }
  
  return null
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
  return localStorage.getItem('token')
}

