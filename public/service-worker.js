const CACHE_NAME = 'events-map-cache-v7';
const urlsToCache = ['/markercluster.js', '/manifest.json'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names
    .filter(name => name.startsWith('events-map-cache-') && name !== CACHE_NAME)
    .map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  // Only explicitly public assets may enter Cache Storage. API capabilities,
  // admin pages, authorization headers and query strings always use the network.
  const cacheable = request.method === 'GET' && url.origin === self.location.origin
    && !url.search && !request.headers?.has('Authorization') && urlsToCache.includes(url.pathname);
  if (!cacheable) {
    event.respondWith(fetch(request, {cache: 'no-store'}));
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.status === 200 && !/no-store|private/i.test(response.headers.get('Cache-Control') || '')) {
      await cache.put(request, response.clone());
    }
    return response;
  }));
});
