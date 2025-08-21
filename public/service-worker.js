const CACHE_NAME = 'events-map-cache-v2'; // Bump version to trigger update
const urlsToCache = [
  '/', // Cache the root to allow offline start
  '/client.html',
  '/css/shared.css',
  '/css/client.css',
  '/client.js',
  '/markercluster.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // We don't call skipWaiting() here because we want to give the user
  // the choice to update when they are ready.
});

// Listen for a message from the client to skip waiting.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // If this cache name is not in our whitelist, delete it.
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients immediately.
  );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // For API calls, use a "stale-while-revalidate" strategy.
    // This serves a cached response immediately for speed, then fetches
    // a fresh version in the background to update the cache for next time.
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(request).then(cachedResponse => {
                    const fetchPromise = fetch(request).then(networkResponse => {
                        // If the fetch is successful, update the cache.
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });

                    // Return the cached response immediately if available,
                    // otherwise wait for the network response.
                    return cachedResponse || fetchPromise;
                });
            })
        );
    } else {
        // For static assets (CSS, JS, etc.), use a "cache-first" strategy.
        // If it's in the cache, serve it. If not, go to the network.
        event.respondWith(
            caches.match(request).then(response => {
                return response || fetch(request).then(networkResponse => {
                    // Optionally, cache newly fetched static assets as well.
                    return caches.open(CACHE_NAME).then(cache => {
                        // Be careful not to cache everything, only known assets.
                        // This example caches any non-API asset upon first request.
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
});
