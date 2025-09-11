// Offline support and service worker management

export interface OfflineConfig {
  enableOfflineMode: boolean
  cacheStrategy: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate'
  maxCacheSize: number
  cacheExpiration: number
}

export interface CachedItem {
  key: string
  data: any
  timestamp: number
  expiresAt: number
  version: string
}

class OfflineManager {
  private config: OfflineConfig = {
    enableOfflineMode: true,
    cacheStrategy: 'networkFirst',
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours
  }

  private cache = new Map<string, CachedItem>()
  private isOnline = navigator.onLine
  private serviceWorker: ServiceWorker | null = null

  // Initialize offline support
  async initialize() {
    if (!this.config.enableOfflineMode) return

    this.setupOnlineOfflineListeners()
    await this.registerServiceWorker()
    this.setupCacheManagement()
    this.setupOfflineIndicator()
  }

  // Setup online/offline event listeners
  private setupOnlineOfflineListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.handleOnline()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.handleOffline()
    })
  }

  // Register service worker
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        this.serviceWorker = registration.active || registration.waiting || registration.installing
        
        console.log('Service Worker registered successfully')
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  // Setup cache management
  private setupCacheManagement() {
    // Clean expired cache entries periodically
    setInterval(() => {
      this.cleanExpiredCache()
    }, 60 * 60 * 1000) // Every hour

    // Monitor cache size
    setInterval(() => {
      this.monitorCacheSize()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  // Setup offline indicator
  private setupOfflineIndicator() {
    const indicator = document.createElement('div')
    indicator.id = 'offline-indicator'
    indicator.className = 'offline-indicator'
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      text-align: center;
      padding: 8px;
      z-index: 9999;
      transform: translateY(-100%);
      transition: transform 0.3s ease;
    `
    indicator.textContent = 'You are offline. Some features may be limited.'
    
    document.body.appendChild(indicator)

    // Show/hide based on online status
    this.updateOfflineIndicator()
  }

  // Update offline indicator visibility
  private updateOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator')
    if (indicator) {
      if (this.isOnline) {
        indicator.style.transform = 'translateY(-100%)'
      } else {
        indicator.style.transform = 'translateY(0)'
      }
    }
  }

  // Handle online event
  private handleOnline() {
    console.log('App is back online')
    this.updateOfflineIndicator()
    
    // Sync any pending offline data
    this.syncOfflineData()
    
    // Announce to screen readers
    if (typeof window !== 'undefined' && window.accessibilityManager) {
      window.accessibilityManager.announce('Connection restored. You are back online.')
    }
  }

  // Handle offline event
  private handleOffline() {
    console.log('App is offline')
    this.updateOfflineIndicator()
    
    // Announce to screen readers
    if (typeof window !== 'undefined' && window.accessibilityManager) {
      window.accessibilityManager.announce('Connection lost. You are now offline.')
    }
  }

  // Cache data for offline use
  async cacheData(key: string, data: any, version: string = '1.0'): Promise<void> {
    const item: CachedItem = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.cacheExpiration,
      version
    }

    this.cache.set(key, item)
    
    // Store in IndexedDB for persistence
    await this.storeInIndexedDB(item)
  }

  // Retrieve cached data
  async getCachedData(key: string): Promise<any | null> {
    // Check memory cache first
    const item = this.cache.get(key)
    if (item && item.expiresAt > Date.now()) {
      return item.data
    }

    // Check IndexedDB
    const dbItem = await this.getFromIndexedDB(key)
    if (dbItem && dbItem.expiresAt > Date.now()) {
      this.cache.set(key, dbItem)
      return dbItem.data
    }

    return null
  }

  // Store data in IndexedDB
  private async storeInIndexedDB(item: CachedItem): Promise<void> {
    try {
      const db = await this.openIndexedDB()
      const transaction = db.transaction(['offlineCache'], 'readwrite')
      const store = transaction.objectStore('offlineCache')
      await store.put(item)
    } catch (error) {
      console.error('Failed to store in IndexedDB:', error)
    }
  }

  // Get data from IndexedDB
  private async getFromIndexedDB(key: string): Promise<CachedItem | null> {
    try {
      const db = await this.openIndexedDB()
      const transaction = db.transaction(['offlineCache'], 'readonly')
      const store = transaction.objectStore('offlineCache')
      const result = await store.get(key)
      return result || null
    } catch (error) {
      console.error('Failed to get from IndexedDB:', error)
      return null
    }
  }

  // Open IndexedDB
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CloudGreetOffline', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('offlineCache')) {
          const store = db.createObjectStore('offlineCache', { keyPath: 'key' })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
        }
      }
    })
  }

  // Clean expired cache entries
  private cleanExpiredCache() {
    const now = Date.now()
    
    // Clean memory cache
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt <= now) {
        this.cache.delete(key)
      }
    }

    // Clean IndexedDB
    this.cleanExpiredIndexedDB()
  }

  // Clean expired entries from IndexedDB
  private async cleanExpiredIndexedDB() {
    try {
      const db = await this.openIndexedDB()
      const transaction = db.transaction(['offlineCache'], 'readwrite')
      const store = transaction.objectStore('offlineCache')
      const index = store.index('expiresAt')
      const range = IDBKeyRange.upperBound(Date.now())
      
      const request = index.openCursor(range)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
    } catch (error) {
      console.error('Failed to clean IndexedDB:', error)
    }
  }

  // Monitor cache size
  private monitorCacheSize() {
    const cacheSize = this.calculateCacheSize()
    
    if (cacheSize > this.config.maxCacheSize) {
      this.evictOldestCache()
    }
  }

  // Calculate current cache size
  private calculateCacheSize(): number {
    let size = 0
    for (const item of this.cache.values()) {
      size += JSON.stringify(item).length * 2 // Rough estimate
    }
    return size
  }

  // Evict oldest cache entries
  private evictOldestCache() {
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25)
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  // Sync offline data when back online
  private async syncOfflineData() {
    // This would sync any data that was created/modified while offline
    // Implementation depends on your specific data sync requirements
    
    const pendingActions = await this.getPendingActions()
    
    for (const action of pendingActions) {
      try {
        await this.executeAction(action)
        await this.removePendingAction(action.id)
      } catch (error) {
        console.error('Failed to sync action:', action, error)
      }
    }
  }

  // Get pending actions from offline storage
  private async getPendingActions(): Promise<any[]> {
    try {
      const db = await this.openIndexedDB()
      const transaction = db.transaction(['pendingActions'], 'readonly')
      const store = transaction.objectStore('pendingActions')
      const result = await store.getAll()
      return result || []
    } catch (error) {
      console.error('Failed to get pending actions:', error)
      return []
    }
  }

  // Execute a pending action
  private async executeAction(action: any): Promise<void> {
    // This would execute the actual API call
    // Implementation depends on your API structure
    
    const response = await fetch(action.url, {
      method: action.method,
      headers: action.headers,
      body: action.body
    })

    if (!response.ok) {
      throw new Error(`Action failed: ${response.statusText}`)
    }
  }

  // Remove a pending action
  private async removePendingAction(actionId: string): Promise<void> {
    try {
      const db = await this.openIndexedDB()
      const transaction = db.transaction(['pendingActions'], 'readwrite')
      const store = transaction.objectStore('pendingActions')
      await store.delete(actionId)
    } catch (error) {
      console.error('Failed to remove pending action:', error)
    }
  }

  // Add a pending action for offline sync
  async addPendingAction(action: any): Promise<void> {
    try {
      const db = await this.openIndexedDB()
      const transaction = db.transaction(['pendingActions'], 'readwrite')
      const store = transaction.objectStore('pendingActions')
      await store.add({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...action,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Failed to add pending action:', error)
    }
  }

  // Check if app is online
  isAppOnline(): boolean {
    return this.isOnline
  }

  // Get offline status
  getOfflineStatus(): { isOnline: boolean; cachedItems: number; cacheSize: number } {
    return {
      isOnline: this.isOnline,
      cachedItems: this.cache.size,
      cacheSize: this.calculateCacheSize()
    }
  }

  // Clear all cache
  async clearCache(): Promise<void> {
    this.cache.clear()
    
    try {
      const db = await this.openIndexedDB()
      const transaction = db.transaction(['offlineCache'], 'readwrite')
      const store = transaction.objectStore('offlineCache')
      await store.clear()
    } catch (error) {
      console.error('Failed to clear IndexedDB cache:', error)
    }
  }
}

// Singleton instance
export const offlineManager = new OfflineManager()

// Initialize on DOM ready
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    offlineManager.initialize()
  })
}

// Utility functions for offline support
export async function fetchWithOfflineSupport(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const cacheKey = `fetch_${url}_${JSON.stringify(options)}`
  
  // Try to get from cache first if offline
  if (!offlineManager.isAppOnline()) {
    const cachedData = await offlineManager.getCachedData(cacheKey)
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  try {
    const response = await fetch(url, options)
    
    // Cache successful responses
    if (response.ok) {
      const data = await response.clone().json()
      await offlineManager.cacheData(cacheKey, data)
    }
    
    return response
  } catch (error) {
    // If offline and no cache, return cached data or error
    if (!offlineManager.isAppOnline()) {
      const cachedData = await offlineManager.getCachedData(cacheKey)
      if (cachedData) {
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
    
    throw error
  }
}

export function queueOfflineAction(action: {
  url: string
  method: string
  headers?: Record<string, string>
  body?: any
}): void {
  if (!offlineManager.isAppOnline()) {
    offlineManager.addPendingAction(action)
  }
}

// Service Worker registration
export function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(resolve)
        .catch(reject)
    } else {
      reject(new Error('Service Worker not supported'))
    }
  })
}

// Make offline manager available globally
if (typeof window !== 'undefined') {
  (window as any).offlineManager = offlineManager
}
