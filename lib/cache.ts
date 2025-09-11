// Simple in-memory cache for API responses
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize = 1000

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

export const cache = new MemoryCache()

// Cache keys
export const CACHE_KEYS = {
  USER_STATS: (userId: string) => `user_stats_${userId}`,
  BUSINESS_STATS: (userId: string) => `business_stats_${userId}`,
  RECENT_ACTIVITY: (userId: string) => `recent_activity_${userId}`,
  CALL_LOGS: (userId: string) => `call_logs_${userId}`,
  BOOKINGS: (userId: string) => `bookings_${userId}`,
  SYSTEM_STATUS: 'system_status',
  API_STATUS: 'api_status'
}

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
  USER_STATS: 300000, // 5 minutes
  BUSINESS_STATS: 300000, // 5 minutes
  RECENT_ACTIVITY: 60000, // 1 minute
  CALL_LOGS: 120000, // 2 minutes
  BOOKINGS: 120000, // 2 minutes
  SYSTEM_STATUS: 60000, // 1 minute
  API_STATUS: 30000 // 30 seconds
}
