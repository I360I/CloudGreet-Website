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
    // Prioritize secure cookie (httpOnly, more secure)
    // Fallback to localStorage for migration/compatibility
    let token: string | null = null
    
    // Try secure cookie via API first (preferred method)
    try {
      token = await getAuthToken()
    } catch (error) {
      // Fallback to localStorage if cookie retrieval fails
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      }
    }
    
    // If still no token, try localStorage as final fallback
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('token') || localStorage.getItem('auth_token')
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

