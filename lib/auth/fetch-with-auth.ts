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
 * Includes retry logic for 401 errors
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

  // Helper to get token
  const getToken = async (): Promise<string | null> => {
    // Try secure cookie via API first (preferred method)
    try {
      const token = await getAuthToken()
      if (token) return token
    } catch (error) {
      // Fallback to localStorage if cookie retrieval fails
    }
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || localStorage.getItem('auth_token')
    }
    
    return null
  }

  if (requireAuth) {
    let token = await getToken()
    
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  // Make initial request
  let response = await fetch(url, {
    ...restOptions,
    headers: finalHeaders,
    credentials: 'include', // Include cookies
  })

  // Retry once on 401 with fresh token
  if (response.status === 401 && requireAuth) {
    // Clear any cached token and get fresh one
    if (typeof window !== 'undefined') {
      // Force fresh token retrieval
      const freshToken = await getToken()
      
      if (freshToken && freshToken !== finalHeaders['Authorization']?.toString().replace('Bearer ', '')) {
        // Retry with fresh token
        finalHeaders['Authorization'] = `Bearer ${freshToken}`
        response = await fetch(url, {
          ...restOptions,
          headers: finalHeaders,
          credentials: 'include',
        })
      }
    }
  }

  return response
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

