/**
 * Performance Optimization Utilities
 * Centralized performance monitoring and optimization helpers
 */

import { logger } from '@/lib/monitoring'
import { API_CONFIG, DB_CONFIG } from '@/lib/constants'

export interface PerformanceMetrics {
  startTime: number
  endTime?: number
  duration?: number
  operation: string
  success: boolean
  error?: string
}

/**
 * Performance monitoring wrapper for async operations
 */
export async function withPerformanceMonitoring<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await fn()
    const duration = Date.now() - startTime
    
    logger.info('Performance metric', {
      operation,
      duration,
      success: true
    })
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error('Performance metric', {
      operation,
      duration,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    throw error
  }
}

/**
 * Database query optimization helper
 */
export function optimizeQuery(query: any, options: {
  select?: string[]
  limit?: number
  offset?: number
  orderBy?: { column: string; ascending?: boolean }
}) {
  let optimizedQuery = query
  
  // Apply select optimization
  if (options.select && options.select.length > 0) {
    optimizedQuery = optimizedQuery.select(options.select.join(', '))
  }
  
  // Apply pagination
  if (options.limit) {
    optimizedQuery = optimizedQuery.limit(options.limit)
  }
  
  if (options.offset) {
    optimizedQuery = optimizedQuery.range(options.offset, options.offset + (options.limit || 50) - 1)
  }
  
  // Apply ordering
  if (options.orderBy) {
    optimizedQuery = optimizedQuery.order(
      options.orderBy.column, 
      { ascending: options.orderBy.ascending ?? true }
    )
  }
  
  return optimizedQuery
}

/**
 * Batch database operations for better performance
 */
export async function batchDatabaseOperations<T>(
  operations: Array<() => Promise<T>>,
  batchSize: number = 5
): Promise<T[]> {
  const results: T[] = []
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(op => op()))
    results.push(...batchResults)
  }
  
  return results
}

/**
 * Cache helper for frequently accessed data
 */
export class SimpleCache<T> {
  private cache = new Map<string, { data: T; expiry: number }>()
  
  set(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    })
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  size(): number {
    return this.cache.size
  }
}

/**
 * Request timeout helper
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = API_CONFIG.TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    )
  ])
}

/**
 * Database connection optimization
 */
export function getOptimizedQueryOptions() {
  return {
    timeout: DB_CONFIG.QUERY_TIMEOUT_MS,
    retry: {
      attempts: 3,
      delay: 1000
    }
  }
}
