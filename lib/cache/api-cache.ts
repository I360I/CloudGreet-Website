/**
 * API Response Caching Middleware
 * Provides intelligent caching for API responses with invalidation strategies
 */

import { NextRequest, NextResponse } from 'next/server';
import { cache } from './redis-cache';
import { logger } from '../monitoring';
import { TIMEOUTS } from '../constants/timeouts';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyGenerator?: (req: NextRequest) => string;
  shouldCache?: (req: NextRequest, res: NextResponse) => boolean;
  shouldInvalidate?: (req: NextRequest) => boolean;
  tags?: string[]; // Cache tags for invalidation
  vary?: string[]; // Headers to vary cache by
}

export interface CachedResponse {
  data: any;
  headers: Record<string, string>;
  status: number;
  timestamp: number;
  ttl: number;
  tags: string[];
}

export class APICache {
  private static readonly DEFAULT_TTL = 300; // 5 minutes
  private static readonly CACHE_PREFIX = 'api:';
  private static readonly TAG_PREFIX = 'tag:';

  /**
   * Generate cache key for request
   */
  static generateCacheKey(req: NextRequest, customKey?: string): string {
    if (customKey) {
      return `${this.CACHE_PREFIX}${customKey}`;
    }

    const url = new URL(req.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams.toString();
    const method = req.method;
    
    // Include relevant headers in cache key
    const varyHeaders = ['authorization', 'accept-language', 'user-agent'];
    const headerValues = varyHeaders
      .map(header => `${header}:${req.headers.get(header) || ''}`)
      .join('|');

    const key = `${method}:${pathname}:${searchParams}:${headerValues}`;
    return `${this.CACHE_PREFIX}${Buffer.from(key).toString('base64')}`;
  }

  /**
   * Check if request should be cached
   */
  static shouldCache(req: NextRequest, config: CacheConfig): boolean {
    // Only cache GET requests by default
    if (req.method !== 'GET') {
      return false;
    }

    // Don't cache requests with no-cache header
    if (req.headers.get('cache-control')?.includes('no-cache')) {
      return false;
    }

    // Don't cache authenticated requests by default
    if (req.headers.get('authorization') && !config.shouldCache) {
      return false;
    }

    return config.shouldCache ? config.shouldCache(req, new NextResponse()) : true;
  }

  /**
   * Get cached response
   */
  static async getCachedResponse(
    req: NextRequest, 
    config: CacheConfig
  ): Promise<NextResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(req, config.keyGenerator?.(req));
      const cached = await cache.get<CachedResponse>(cacheKey);

      if (!cached) {
        return null;
      }

      // Check if cache is expired
      const now = Date.now();
      if (now - cached.timestamp > cached.ttl * 1000) {
        await cache.delete(cacheKey);
        return null;
      }

      // Create response from cached data
      const response = NextResponse.json(cached.data, { status: cached.status });
      
      // Restore headers
      Object.entries(cached.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Add cache headers
      response.headers.set('X-Cache', 'HIT');
      response.headers.set('X-Cache-Timestamp', cached.timestamp.toString());
      response.headers.set('X-Cache-TTL', cached.ttl.toString());

      logger.debug('Cache hit', { cacheKey, ttl: cached.ttl });
      return response;
    } catch (error) {
      logger.error('Cache get error', { error });
      return null;
    }
  }

  /**
   * Cache response
   */
  static async cacheResponse(
    req: NextRequest,
    response: NextResponse,
    config: CacheConfig
  ): Promise<void> {
    try {
      // Check if response should be cached
      if (!this.shouldCache(req, config)) {
        return;
      }

      const cacheKey = this.generateCacheKey(req, config.keyGenerator?.(req));
      
      // Clone response to read body
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();

      // Prepare cached response
      const cachedResponse: CachedResponse = {
        data,
        headers: Object.fromEntries(response.headers.entries()),
        status: response.status,
        timestamp: Date.now(),
        ttl: config.ttl,
        tags: config.tags || [],
      };

      // Store in cache
      await cache.set(cacheKey, cachedResponse, { ttl: config.ttl });

      // Store cache tags for invalidation
      if (config.tags && config.tags.length > 0) {
        await this.storeCacheTags(cacheKey, config.tags);
      }

      logger.debug('Response cached', { cacheKey, ttl: config.ttl, tags: config.tags?.join(', ') });
    } catch (error) {
      logger.error('Cache set error', { error });
    }
  }

  /**
   * Invalidate cache by tags
   */
  static async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalInvalidated = 0;

      for (const tag of tags) {
        const tagKey = `${this.TAG_PREFIX}${tag}`;
        const cacheKeys = await cache.get<string[]>(tagKey) || [];
        
        if (cacheKeys.length > 0) {
          // Delete all cached responses for this tag
          for (const key of cacheKeys) {
            await cache.delete(key);
          }
          
          // Clear tag mapping
          await cache.delete(tagKey);
          totalInvalidated += cacheKeys.length;
        }
      }

      logger.info('Cache invalidated by tags', { tags: tags.join(', '), invalidated: totalInvalidated });
      return totalInvalidated;
    } catch (error) {
      logger.error('Cache invalidation error', { error: error instanceof Error ? error.message : JSON.stringify(error), tags: tags.join(', ') });
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const searchPattern = `${this.CACHE_PREFIX}*${pattern}*`;
      const invalidated = await cache.clear(searchPattern);
      
      logger.info('Cache invalidated by pattern', { pattern, invalidated });
      return invalidated;
    } catch (error) {
      logger.error('Cache invalidation error', { error, pattern });
      return 0;
    }
  }

  /**
   * Store cache tags for invalidation
   */
  private static async storeCacheTags(cacheKey: string, tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = `${this.TAG_PREFIX}${tag}`;
        const existingKeys = await cache.get<string[]>(tagKey) || [];
        
        if (!existingKeys.includes(cacheKey)) {
          existingKeys.push(cacheKey);
          await cache.set(tagKey, existingKeys, { ttl: 86400 }); // 24 hours
        }
      }
    } catch (error) {
      logger.error('Error storing cache tags', { error: error instanceof Error ? error.message : JSON.stringify(error), cacheKey, tags: tags?.join(', ') });
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    cache: any;
    api: {
      totalRequests: number;
      cacheHits: number;
      cacheMisses: number;
      hitRate: number;
    };
  }> {
    try {
      const cacheStats = cache.stats();
      const cacheInfo = await cache.info();
      
      return {
        cache: cacheInfo,
        api: {
          totalRequests: cacheStats.hits + cacheStats.misses,
          cacheHits: cacheStats.hits,
          cacheMisses: cacheStats.misses,
          hitRate: cacheStats.hitRate,
        },
      };
    } catch (error) {
      logger.error('Error getting cache stats', { error });
      return {
        cache: {},
        api: {
          totalRequests: 0,
          cacheHits: 0,
          cacheMisses: 0,
          hitRate: 0,
        },
      };
    }
  }

  /**
   * Clear all API cache
   */
  static async clearAll(): Promise<number> {
    try {
      const cleared = await cache.clear(`${this.CACHE_PREFIX}*`);
      logger.info('All API cache cleared', { cleared });
      return cleared;
    } catch (error) {
      logger.error('Error clearing API cache', { error });
      return 0;
    }
  }
}

// Predefined cache configurations
export const CACHE_CONFIGS = {
  // User data cache (5 minutes)
  USER_DATA: {
    ttl: 300,
    tags: ['user'],
    shouldCache: (req: NextRequest) => req.method === 'GET' && req.url.includes('/api/user/'),
  },

  // Business data cache (10 minutes)
  BUSINESS_DATA: {
    ttl: 600,
    tags: ['business'],
    shouldCache: (req: NextRequest) => req.method === 'GET' && req.url.includes('/api/business/'),
  },

  // Analytics data cache (15 minutes)
  ANALYTICS: {
    ttl: 900,
    tags: ['analytics'],
    shouldCache: (req: NextRequest) => req.method === 'GET' && req.url.includes('/api/analytics/'),
  },

  // Dashboard data cache (2 minutes)
  DASHBOARD: {
    ttl: 120,
    tags: ['dashboard'],
    shouldCache: (req: NextRequest) => req.method === 'GET' && req.url.includes('/api/dashboard/'),
  },

  // Static data cache (1 hour)
  STATIC: {
    ttl: 3600,
    tags: ['static'],
    shouldCache: (req: NextRequest) => req.method === 'GET' && req.url.includes('/api/static/'),
  },
} as const;





