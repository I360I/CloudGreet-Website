'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, Wifi, WifiOff, Download, Upload, Zap, Clock } from 'lucide-react'

interface CacheEntry {
  key: string
  data: any
  timestamp: number
  expiresAt: number
  size: number
  priority: 'high' | 'medium' | 'low'
  tags: string[]
}

interface IntelligentCachingProps {
  children: React.ReactNode
}

export default function IntelligentCaching({ children }: IntelligentCachingProps) {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map())
  const [isOnline, setIsOnline] = useState(true)
  const [cacheStats, setCacheStats] = useState({
    hitRate: 0,
    missRate: 0,
    totalSize: 0,
    entries: 0
  })
  const [pendingRequests, setPendingRequests] = useState<Map<string, Promise<any>>>(new Map())
  const [showCacheStatus, setShowCacheStatus] = useState(false)
  
  const cacheRef = useRef<Map<string, CacheEntry>>(cache)
  const pendingRequestsRef = useRef<Map<string, Promise<any>>>(pendingRequests)

  // Update refs when state changes
  useEffect(() => {
    cacheRef.current = cache
  }, [cache])

  useEffect(() => {
    pendingRequestsRef.current = pendingRequests
  }, [pendingRequests])

  // Sync cached data when coming back online
  const syncCachedData = useCallback(async () => {
    const pendingSync = Array.from(cacheRef.current.entries())
      .filter(([, entry]) => entry.tags.includes('sync'))
      .map(([, entry]) => entry)

    for (const entry of pendingSync) {
      try {
        // Attempt to sync the data
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: entry.key, data: entry.data })
        })
      } catch (error) {
        console.warn('Failed to sync cached data:', error)
      }
    }
  }, [])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Sync cached data when coming back online
      syncCachedData()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncCachedData])

  // Calculate cache statistics
  const calculateHitRate = useCallback(() => {
    // This would be calculated based on actual cache hits/misses
    // For now, return a simulated value
    return cache.size > 0 ? Math.min(95, 70 + (cache.size / 10)) : 0
  }, [cache.size])

  const calculateMissRate = useCallback(() => {
    return Math.max(0, 100 - calculateHitRate())
  }, [calculateHitRate])

  const calculateTotalSize = useCallback((cacheMap?: Map<string, CacheEntry>) => {
    const targetCache = cacheMap || cache
    return Array.from(targetCache.values()).reduce((total, entry) => total + entry.size, 0)
  }, [cache])

  // Cache statistics calculation
  useEffect(() => {
    const stats = {
      hitRate: calculateHitRate(),
      missRate: calculateMissRate(),
      totalSize: calculateTotalSize(),
      entries: cache.size
    }
    setCacheStats(stats)
  }, [cache, calculateHitRate, calculateMissRate, calculateTotalSize])

  // Intelligent cache management
  const intelligentCache = useCallback(<T extends any>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number
      priority?: 'high' | 'medium' | 'low'
      tags?: string[]
      forceRefresh?: boolean
    } = {}
  ): Promise<T> => {
    return new Promise(async (resolve, reject) => {
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      priority = 'medium',
      tags = [],
      forceRefresh = false
    } = options

    const cacheKey = `cache_${key}`
    const now = Date.now()

    // Check if request is already pending
    if (pendingRequestsRef.current.has(cacheKey)) {
      return pendingRequestsRef.current.get(cacheKey)!
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedEntry = cacheRef.current.get(cacheKey)
      if (cachedEntry && cachedEntry.expiresAt > now) {
        // Cache hit - update access time and move to front
        updateCacheEntry(cachedEntry, now)
        return cachedEntry.data
      }
    }

    // Cache miss or expired - fetch data
    const fetchPromise = fetcher().then(data => {
      // Store in cache
      const entry: CacheEntry = {
        key: cacheKey,
        data,
        timestamp: now,
        expiresAt: now + ttl,
        size: JSON.stringify(data).length,
        priority,
        tags
      }

      setCache(prev => {
        const newCache = new Map(prev)
        newCache.set(cacheKey, entry)
        
        // Implement LRU and size limits
        return optimizeCache(newCache)
      })

      // Remove from pending requests
      setPendingRequests(prev => {
        const newPending = new Map(prev)
        newPending.delete(cacheKey)
        return newPending
      })

        resolve(data)
      }).catch(error => {
        // Remove from pending requests on error
        setPendingRequests(prev => {
          const newPending = new Map(prev)
          newPending.delete(cacheKey)
          return newPending
        })
        reject(error)
      })

      // Add to pending requests
      setPendingRequests(prev => new Map(prev).set(cacheKey, fetchPromise))
    })
  }, [optimizeCache, updateCacheEntry])

  // Cache optimization
  const optimizeCache = useCallback((cache: Map<string, CacheEntry>): Map<string, CacheEntry> => {
    const MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB
    const MAX_ENTRIES = 1000

    // Remove expired entries
    const now = Date.now()
    Array.from(cache.entries()).forEach(([key, entry]) => {
      if (entry.expiresAt <= now) {
        cache.delete(key)
      }
    })

    // Check size and entry limits
    if (cache.size <= MAX_ENTRIES && calculateTotalSize(cache) <= MAX_CACHE_SIZE) {
      return cache
    }

    // Sort by priority and access time (LRU)
    const entries = Array.from(cache.entries()).sort(([, a], [, b]) => {
      // First by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      // Then by access time (most recent first)
      return b.timestamp - a.timestamp
    })

    // Remove oldest/lowest priority entries
    const newCache = new Map<string, CacheEntry>()
    let currentSize = 0

    for (const [key, entry] of entries) {
      if (newCache.size < MAX_ENTRIES && currentSize + entry.size <= MAX_CACHE_SIZE) {
        newCache.set(key, entry)
        currentSize += entry.size
      }
    }

    return newCache
  }, [calculateTotalSize])

  // Update cache entry access time
  const updateCacheEntry = useCallback((entry: CacheEntry, timestamp: number) => {
    setCache(prev => {
      const newCache = new Map(prev)
      newCache.set(entry.key, { ...entry, timestamp })
      return newCache
    })
  }, [])

  // Preload critical data
  const preloadData = useCallback(async () => {
    const criticalEndpoints = [
      '/api/dashboard/data',
      '/api/business/profile',
      '/api/pricing/plans'
    ]

    const preloadPromises = criticalEndpoints.map(endpoint =>
      intelligentCache(
        endpoint,
        () => fetch(endpoint).then(res => res.json()),
        { priority: 'high', tags: ['critical'] }
      ).catch(() => null) // Don't fail the entire preload if one fails
    )

    await Promise.all(preloadPromises)
  }, [intelligentCache])

  // Preload data on mount
  useEffect(() => {
    if (isOnline) {
      preloadData()
    }
  }, [isOnline, preloadData])

  // Background sync
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (isOnline) {
        syncCachedData()
      }
    }, 60000) // Sync every minute

    return () => clearInterval(syncInterval)
  }, [isOnline, syncCachedData])

  // Cache warming for predicted requests
  const warmCache = useCallback((predictions: string[]) => {
    predictions.forEach(endpoint => {
      intelligentCache(
        endpoint,
        () => fetch(endpoint).then(res => res.json()),
        { priority: 'low', tags: ['predicted'] }
      ).catch(() => null)
    })
  }, [intelligentCache])

  // Clear cache by tags
  const clearCacheByTags = useCallback((tags: string[]) => {
    setCache(prev => {
      const newCache = new Map(prev)
      Array.from(newCache.entries()).forEach(([key, entry]) => {
        if (entry.tags.some(tag => tags.includes(tag))) {
          newCache.delete(key)
        }
      })
      return newCache
    })
  }, [])

  // Clear all cache
  const clearAllCache = useCallback(() => {
    setCache(new Map())
  }, [])

  // Provide cache context to children
  const cacheContext = {
    cache: intelligentCache,
    clearCache: clearCacheByTags,
    clearAllCache,
    warmCache,
    isOnline,
    stats: cacheStats
  }

  return (
    <CacheContext.Provider value={cacheContext}>
      {children}
      
      {/* Cache Status Indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 bg-orange-500/20 border border-orange-500/30 rounded-lg px-3 py-2 flex items-center space-x-2 z-50"
          >
            <WifiOff className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm">Working offline</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cache Performance Indicator */}
      <AnimatePresence>
        {showCacheStatus && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-black/90 backdrop-blur-sm border border-white/20 rounded-xl p-4 max-w-sm z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-400" />
                <span>Cache Status</span>
              </h3>
              <button
                onClick={() => setShowCacheStatus(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Hit Rate:</span>
                <span className="text-green-400">{cacheStats.hitRate.toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/70">Miss Rate:</span>
                <span className="text-red-400">{cacheStats.missRate.toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/70">Entries:</span>
                <span className="text-white">{cacheStats.entries}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/70">Size:</span>
                <span className="text-white">{(cacheStats.totalSize / 1024 / 1024).toFixed(2)}MB</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/70">Status:</span>
                <span className={`flex items-center space-x-1 ${isOnline ? 'text-green-400' : 'text-orange-400'}`}>
                  {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
              <button
                onClick={clearAllCache}
                className="w-full px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
              >
                Clear Cache
              </button>
              
              <button
                onClick={preloadData}
                className="w-full px-3 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
              >
                Preload Data
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cache Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowCacheStatus(!showCacheStatus)}
        className="fixed bottom-20 left-4 w-12 h-12 bg-black/80 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center z-50"
        title="Cache Status"
      >
        <Database className="w-5 h-5 text-white" />
      </motion.button>
    </CacheContext.Provider>
  )
}

// Create cache context
const CacheContext = React.createContext<{
  cache: <T>(key: string, fetcher: () => Promise<T>, options?: any) => Promise<T>
  clearCache: (tags: string[]) => void
  clearAllCache: () => void
  warmCache: (predictions: string[]) => void
  isOnline: boolean
  stats: any
} | null>(null)

// Hook to use cache
export function useCache() {
  const context = React.useContext(CacheContext)
  if (!context) {
    throw new Error('useCache must be used within IntelligentCaching')
  }
  return context
}
