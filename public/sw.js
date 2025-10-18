const CACHE_NAME = 'cloudgreet-v2.0.0'

// Simple service worker - no complex caching that can fail
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('Service Worker: Activated')
      return self.clients.claim()
    })
  )
})

self.addEventListener('fetch', (event) => {
  // Simple fetch handling - no complex caching
  event.respondWith(fetch(event.request))
})