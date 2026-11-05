// Cache public application files only. Never cache answers, notes, or requests
// outside this application's origin and explicitly listed paths.
const CACHE_PREFIX = `recomeco-static-${encodeURIComponent(new URL(self.registration.scope).pathname)}-`;
const CACHE_NAME = `${CACHE_PREFIX}4ac54fe365d5e51b5cf8`;
const ASSETS = ['./', './manifest.webmanifest', './favicon.svg', './icons/app-192.png', './icons/app-512.png']
  .map((path) => new URL(path, self.registration.scope).href);
const HOME = ASSETS[0];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload', credentials: 'omit' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const documentPath = url.pathname === new URL(HOME).pathname || url.pathname === new URL('./index.html', HOME).pathname;
  if (request.mode === 'navigate' && documentPath) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(new Request(request, { cache: 'no-cache' }));
        if (response.ok) {
          try { await cache.put(HOME, response.clone()); } catch { /* A full storage quota must not prevent online use. */ }
        }
        return response;
      } catch {
        return (await cache.match(HOME)) || Response.error();
      }
    })());
  } else if (ASSETS.includes(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(url.href)) || fetch(request);
    })());
  }
});
