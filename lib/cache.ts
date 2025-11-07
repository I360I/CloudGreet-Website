// In-memory cache implementation for CloudGreet platform
// For production, consider using Redis or similar distributed cache

interface CacheEntry<T> {
  data: T
  expires: number
  createdAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  public readonly maxSize = 1000 // Maximum number of entries
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    // Remove oldest entries if cache is full
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
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
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
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
      createdAt: Date.now()
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
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
    
    if (!entry) {
      return null
    }

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

    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
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
    if (!entry) return false
    
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
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  /**

   * delete - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.delete(param1, param2)

   * ```

   */

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  /**

   * size - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.size(param1, param2)

   * ```

   */

  size(): number {
    return this.cache.size
  }

  private cleanup(): void {
    const now = Date.now()
    /**
     * for - Add description here
     * 
     * @param {...any} args - Method parameters
     * @returns {Promise<any>} Method return value
     * @throws {Error} When operation fails
     * 
     * @example
     * ```typescript
     * await this.for(param1, param2)
     * ```
     */
    for (const [key, entry] of Array.from(this.cache.entries())) {
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
      if (now > entry.expires) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.cache.clear()
  }
}

// Global cache instance
const cache = new MemoryCache()

// Cache utility functions
export function getCached<T>(key: string): T | null {
  return cache.get<T>(key)
}

export function setCache<T>(key: string, data: T, ttlMs: number = 60000): void {
  cache.set(key, data, ttlMs)
}

/**
 * hasCached - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await hasCached(param1, param2)
 * ```
 */
export function hasCached(key: string): boolean {
  return cache.has(key)
}

/**
 * deleteCached - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await deleteCached(param1, param2)
 * ```
 */
export function deleteCached(key: string): boolean {
  return cache.delete(key)
}

/**
 * clearCache - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await clearCache(param1, param2)
 * ```
 */
export function clearCache(): void {
  cache.clear()
}

// Cache key generators
export const cacheKeys = {
  dashboard: (businessId: string) => `dashboard:${businessId}`,
  roiMetrics: (businessId: string) => `roi:${businessId}`,
  callAnalytics: (businessId: string, timeframe: string) => `analytics:calls:${businessId}:${timeframe}`,
  aiInsights: (businessId: string) => `insights:${businessId}`,
  callRecording: (callId: string) => `recording:${callId}`,
  businessProfile: (businessId: string) => `business:${businessId}`,
  userSession: (userId: string) => `session:${userId}`,
  healthCheck: () => 'health:check'
}

// Cache TTL constants (in milliseconds)
export const cacheTTL = {
  short: 30 * 1000,      // 30 seconds
  medium: 5 * 60 * 1000, // 5 minutes
  long: 30 * 60 * 1000,  // 30 minutes
  veryLong: 2 * 60 * 60 * 1000 // 2 hours
}

// Cache decorator for functions
export function cached<T extends (...args: unknown[]) => any>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttlMs: number = cacheTTL.medium
): T {
  /**
   * return - Add description here
   * 
   * @param {...any} args - Method parameters
   * @returns {Promise<any>} Method return value
   * @throws {Error} When operation fails
   * 
   * @example
   * ```typescript
   * await this.return(param1, param2)
   * ```
   */
  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    const cached = getCached<ReturnType<T>>(key)
    
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
    
    if (cached !== null) {
      return Promise.resolve(cached)
    }
    
    const result = fn(...args)
    
    // Handle both sync and async functions
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
    if (result instanceof Promise) {
      return result.then(data => {
        setCache(key, data, ttlMs)
        return data
      })
    } else {
      setCache(key, result, ttlMs)
      return result
    }
  }) as T
}

// Cache middleware for API routes
export function withCache<T>(
  keyGenerator: (request: Request) => string,
  ttlMs: number = cacheTTL.medium
) {
  return function(handler: (request: Request) => Promise<T>) {
    return async function(request: Request): Promise<T> {
      const key = keyGenerator(request)
      const cached = getCached<T>(key)
      
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
      
      if (cached !== null) {
        return cached
      }
      
      const result = await handler(request)
      setCache(key, result, ttlMs)
      return result
    }
  }
}

// Cache invalidation helpers
/**
 * invalidateBusinessCache - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await invalidateBusinessCache(param1, param2)
 * ```
 */
export function invalidateBusinessCache(businessId: string): void {
  const patterns = [
    cacheKeys.dashboard(businessId),
    cacheKeys.roiMetrics(businessId),
    cacheKeys.aiInsights(businessId),
    cacheKeys.businessProfile(businessId)
  ]
  
  patterns.forEach(key => deleteCached(key))
}

/**
 * invalidateCallCache - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await invalidateCallCache(param1, param2)
 * ```
 */
export function invalidateCallCache(callId: string): void {
  deleteCached(cacheKeys.callRecording(callId))
}

/**
 * invalidateAnalyticsCache - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await invalidateAnalyticsCache(param1, param2)
 * ```
 */
export function invalidateAnalyticsCache(businessId: string): void {
  const timeframes = ['7d', '30d', '90d']
  timeframes.forEach(timeframe => {
    deleteCached(cacheKeys.callAnalytics(businessId, timeframe))
  })
  deleteCached(cacheKeys.aiInsights(businessId))
}

// Cache statistics
/**
 * getCacheStats - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await getCacheStats(param1, param2)
 * ```
 */
export function getCacheStats() {
  return {
    size: cache.size(),
    maxSize: cache.maxSize,
    hitRate: 0, // Would need to track hits/misses for this
    memoryUsage: process.memoryUsage()
  }
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    cache.destroy()
  })
  
  process.on('SIGINT', () => {
    cache.destroy()
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    cache.destroy()
    process.exit(0)
  })
}