const CACHE_NAME = 'cloudgreet-v2.0.0'

// Simple service worker - no complex caching that can fail
self.addEventListener('install', (event) => {
  
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      
      return self.clients.claim()
    })
  )
})

self.addEventListener('fetch', (event) => {
  // Simple fetch handling - no complex caching
  event.respondWith(fetch(event.request))
})
