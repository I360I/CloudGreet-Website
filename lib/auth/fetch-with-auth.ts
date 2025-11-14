/**
 * Fetch wrapper that automatically includes authentication token
 * Uses secure cookie-based token storage
 */

'use client'

import { getAuthToken, getAuthTokenSync } from './token-manager'

export interface FetchOptions extends RequestInit {
  requireAuth?: boolean
}

/**
 * Fetch with automatic authentication
 * Automatically includes token from secure cookie or localStorage fallback
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { requireAuth = true, headers = {}, ...restOptions } = options

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (requireAuth) {
    // For admin pages, prioritize localStorage (admin login stores tokens there)
    // Then try secure cookie via API as fallback
    let token: string | null = null
    
    // Check localStorage first (faster, works for admin login)
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token')
    }
    
    // If no token in localStorage, try secure cookie via API
    if (!token) {
      try {
        token = await getAuthToken()
      } catch (error) {
        // Already checked localStorage above, so token remains null if not found
      }
    }

    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  return fetch(url, {
    ...restOptions,
    headers: finalHeaders,
    credentials: 'include', // Include cookies
  })
}

/**
 * Synchronous version for immediate use
 * Uses localStorage fallback during migration
 */
export function fetchWithAuthSync(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { requireAuth = true, headers = {}, ...restOptions } = options

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (requireAuth) {
    const token = getAuthTokenSync()
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  return fetch(url, {
    ...restOptions,
    headers: finalHeaders,
    credentials: 'include',
  })
}

