const CACHE_NAME = 'utags-cache-v1'
const ASSETS_TO_CACHE = self.__WB_MANIFEST.map((entry) => entry.url)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
  )
})

// 添加更新处理
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})
