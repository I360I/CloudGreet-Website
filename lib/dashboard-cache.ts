/**
 * Dashboard Data Cache
 * Implements client-side caching with TTL and automatic refresh
 * Reduces API calls and improves dashboard load times
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class DashboardCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  
  /**
   * Store data in cache with TTL
   */
  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000 // Convert to milliseconds
    })
  }

  /**
   * Get data from cache if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    const now = Date.now()
    const isExpired = (now - entry.timestamp) > entry.ttl

    /**


     * if - Add description here


     * 


     * @param {...any} args - Method parameters


     * @returns {Promise<any>} Method return value


     * @throws {Error} When operation fails


     * 


     * @example


     * ```typescript


     * await this.if(param1, param2)


     * ```


     */


    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Check if cache has valid data
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Invalidate all entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = []
    
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let valid = 0
    let expired = 0
    const now = Date.now()

    this.cache.forEach((entry) => {
      const isExpired = (now - entry.timestamp) > entry.ttl
      if (isExpired) {
        expired++
      } else {
        valid++
      }
    })

    return {
      total: this.cache.size,
      valid,
      expired,
      hitRate: valid / Math.max(1, this.cache.size)
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((entry, key) => {
      const isExpired = (now - entry.timestamp) > entry.ttl
      if (isExpired) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

// Singleton instance
export const dashboardCache = new DashboardCache()

// Run cleanup every 5 minutes
/**

 * if - Add description here

 * 

 * @param {...any} args - Method parameters

 * @returns {Promise<any>} Method return value

 * @throws {Error} When operation fails

 * 

 * @example

 * ```typescript

 * await this.if(param1, param2)

 * ```

 */

if (typeof window !== 'undefined') {
  setInterval(() => {
    dashboardCache.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * Fetch with cache utility
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMinutes: number = 5
): Promise<T> {
  // Try cache first
  const cached = dashboardCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()
  dashboardCache.set(key, data, ttlMinutes)
  return data
}

/**
 * Invalidate cache on mutation
 */
export function invalidateDashboardCache(businessId?: string): void {
  if (businessId) {
    dashboardCache.invalidatePattern(new RegExp(`^dashboard:${businessId}`))
  } else {
    dashboardCache.clear()
  }
}

