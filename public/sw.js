const CACHE_NAME = 'devpool-pwa-cache-v1';

// Install event: skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: simple stale-while-revalidate for GET requests
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Exclude API calls, Admin routes, and Vite dev server assets from caching
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/@') || 
    url.pathname.includes('node_modules') ||
    url.search.includes('import') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          // Clone the response BEFORE using it or putting it in the cache async
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback or ignore
      });

      return cachedResponse || fetchPromise;
    })
  );
});
