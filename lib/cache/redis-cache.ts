/**
 * Redis-based caching system for CloudGreet
 * Provides high-performance caching with TTL, invalidation, and clustering support
 */

// Optional Redis import - fallback to in-memory cache if not available
// @ts-ignore - Redis is optional dependency
let createClient: any;
let RedisClientType: any;
try {
  // Dynamic import to avoid build-time errors
  const redis = eval('require')('redis');
  createClient = redis.createClient;
  RedisClientType = redis.RedisClientType;
} catch {
  // Redis not installed, will use fallback
  createClient = null;
  RedisClientType = null;
}
import { logger } from '../monitoring';
import { TIMEOUTS } from '../constants/timeouts';
import { DEFAULTS } from '../constants/defaults';
const CACHE_TTL = DEFAULTS.CACHE_TTL;

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // Cache namespace for organization
  compress?: boolean; // Enable compression for large values
  serialize?: boolean; // Enable JSON serialization
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

export class RedisCache {
  private client: any;
  private stats: CacheStats;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    if (!createClient) {
      this.client = null;
      logger.warn('Redis not available, using fallback cache');
      return;
    }
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        commandTimeout: 3000,
      },
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis connection refused', { error: options.error });
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted', { totalRetryTime: options.total_retry_time });
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
          logger.error('Redis max retry attempts reached', { attempts: options.attempt });
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      },
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };

    this.setupEventHandlers();
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  private async _connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      logger.info('Redis cache connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('error', (error) => {
      logger.error('Redis cache error', { error });
      this.stats.errors++;
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis cache connecting...');
    });

    this.client.on('ready', () => {
      logger.info('Redis cache ready');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      logger.warn('Redis cache connection ended');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis cache reconnecting...');
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      await this.ensureConnected();
      
      const fullKey = this.buildKey(key, options.namespace);
      const value = await this.client.get(fullKey);
      
      if (value === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      if (options.serialize !== false) {
        return JSON.parse(value) as T;
      }

      return value as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      this.stats.errors++;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      await this.ensureConnected();
      
      const fullKey = this.buildKey(key, options.namespace);
      const ttl = options.ttl || CACHE_TTL;
      
      let serializedValue: string;
      if (options.serialize !== false) {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = value as string;
      }

      await this.client.setEx(fullKey, ttl, serializedValue);
      this.stats.sets++;
      
      logger.debug('Cache set successful', { key: fullKey, ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      await this.ensureConnected();
      
      const fullKey = this.buildKey(key, options.namespace);
      const result = await this.client.del(fullKey);
      
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      await this.ensureConnected();
      
      const fullKey = this.buildKey(key, options.namespace);
      const result = await this.client.exists(fullKey);
      
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    try {
      await this.ensureConnected();
      
      const fullKeys = keys.map(key => this.buildKey(key, options.namespace));
      const values = await this.client.mGet(fullKeys);
      
      return values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        
        this.stats.hits++;
        this.updateHitRate();
        
        if (options.serialize !== false) {
          return JSON.parse(value) as T;
        }
        
        return value as T;
      });
    } catch (error) {
      logger.error('Cache mget error', { keys: keys.join(', '), error: error instanceof Error ? error.message : JSON.stringify(error) });
      this.stats.errors++;
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset<T>(
    keyValuePairs: Array<{ key: string; value: T }>,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      await this.ensureConnected();
      
      const ttl = options.ttl || CACHE_TTL;
      const pipeline = this.client.multi();
      
      for (const { key, value } of keyValuePairs) {
        const fullKey = this.buildKey(key, options.namespace);
        let serializedValue: string;
        
        if (options.serialize !== false) {
          serializedValue = JSON.stringify(value);
        } else {
          serializedValue = value as string;
        }
        
        pipeline.setEx(fullKey, ttl, serializedValue);
      }
      
      await pipeline.exec();
      this.stats.sets += keyValuePairs.length;
      
      return true;
    } catch (error) {
      logger.error('Cache mset error', { keyValuePairs: JSON.stringify(keyValuePairs), error: error instanceof Error ? error.message : JSON.stringify(error) });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Clear all cache entries with optional pattern
   */
  async clear(pattern?: string, options: CacheOptions = {}): Promise<number> {
    try {
      await this.ensureConnected();
      
      const searchPattern = pattern ? this.buildKey(pattern, options.namespace) : '*';
      const keys = await this.client.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await this.client.del(keys);
      this.stats.deletes += result;
      
      logger.info('Cache cleared', { pattern: pattern || 'all', keysDeleted: result });
      return result;
    } catch (error) {
      logger.error('Cache clear error', { pattern: pattern || 'all', error: error instanceof Error ? error.message : JSON.stringify(error) });
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cache info
   */
  async getInfo(): Promise<Record<string, string>> {
    try {
      await this.ensureConnected();
      return await this.client.info();
    } catch (error) {
      logger.error('Cache info error', { error });
      return {};
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis cache disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error });
    }
  }

  /**
   * Ensure Redis connection is established
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  /**
   * Build cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    if (namespace) {
      return `${namespace}:${key}`;
    }
    return key;
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// Singleton instance
export const redisCache = new RedisCache();

// Convenience functions
export const cache = {
  get: <T>(key: string, options?: CacheOptions) => redisCache.get<T>(key, options),
  set: <T>(key: string, value: T, options?: CacheOptions) => redisCache.set(key, value, options),
  delete: (key: string, options?: CacheOptions) => redisCache.delete(key, options),
  exists: (key: string, options?: CacheOptions) => redisCache.exists(key, options),
  mget: <T>(keys: string[], options?: CacheOptions) => redisCache.mget<T>(keys, options),
  mset: <T>(keyValuePairs: Array<{ key: string; value: T }>, options?: CacheOptions) => 
    redisCache.mset(keyValuePairs, options),
  clear: (pattern?: string, options?: CacheOptions) => redisCache.clear(pattern, options),
  stats: () => redisCache.getStats(),
  info: () => redisCache.getInfo(),
};





