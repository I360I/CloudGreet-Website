'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAuthToken, clearAuthToken, getAuthTokenSync } from '@/lib/auth/token-manager'

/**
 * React hook for managing authentication token
 * Automatically handles secure cookie-based token storage
 */
export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load token on mount
  useEffect(() => {
    async function loadToken() {
      try {
        // Try secure cookie first
        const secureToken = await getAuthToken()
        if (secureToken) {
          setToken(secureToken)
        } else {
          // Fallback to localStorage during migration
          const fallbackToken = getAuthTokenSync()
          setToken(fallbackToken)
        }
      } catch (error) {
        console.error('Failed to load auth token', error)
        // Fallback to localStorage
        setToken(getAuthTokenSync())
      } finally {
        setIsLoading(false)
      }
    }

    loadToken()
  }, [])

  const logout = useCallback(async () => {
    try {
      await clearAuthToken()
      setToken(null)
    } catch (error) {
      console.error('Failed to clear auth token', error)
      // Still clear local state
      setToken(null)
    }
  }, [])

  const getToken = useCallback(async (): Promise<string | null> => {
    if (token) return token
    
    try {
      const fetchedToken = await getAuthToken()
      if (fetchedToken) {
        setToken(fetchedToken)
        return fetchedToken
      }
    } catch (error) {
      console.error('Failed to get auth token', error)
    }
    
    // Fallback to localStorage
    return getAuthTokenSync()
  }, [token])

  return {
    token,
    isLoading,
    logout,
    getToken,
    isAuthenticated: !!token,
  }
}

/**
 * Get token synchronously (for immediate use in fetch calls)
 * Use this when you need the token right away without async
 */
export function useAuthTokenSync() {
  return getAuthTokenSync()
}

