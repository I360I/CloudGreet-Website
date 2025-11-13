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
    // Try to get token from secure cookie first
    let token: string | null = null
    
    try {
      token = await getAuthToken()
    } catch (error) {
      // Fallback to localStorage during migration
      token = getAuthTokenSync()
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

