// Legacy service worker — kept here only so existing installs can
// fetch a worker that tears itself down. New visits don't register a
// worker at all (see app/layout.tsx).

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      } catch {}
      try { await self.clients.claim() } catch {}
      try { await self.registration.unregister() } catch {}
      try {
        const list = await self.clients.matchAll({ type: 'window' })
        list.forEach((c) => c.navigate(c.url))
      } catch {}
    })()
  )
})

// Pass-through; never cache anything.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
