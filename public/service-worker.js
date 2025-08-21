const CACHE_NAME = 'events-map-cache-v1';
const urlsToCache = [
  '/css/shared.css',
  '/css/client.css',
  // Add other important assets here, like CSS, JS, and key images
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
