const CACHE_NAME = 'caravels-v2';

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/favicon.svg',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches, then claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: stale-while-revalidate for static, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // News API — network first, no caching
  if (url.pathname.startsWith('/api/news')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ articles: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // App shell — stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
