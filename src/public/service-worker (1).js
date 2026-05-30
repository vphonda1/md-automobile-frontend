// MD Automobile Service Worker v2
const CACHE_NAME = 'md-automobile-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-96.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API requests: network only (no caching)
  if (url.pathname.startsWith('/api/')) return;

  // Static assets: cache-first
  if (request.destination === 'image' || request.destination === 'font' || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, copy));
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // HTML / navigation: network-first with offline fallback
  event.respondWith(
    fetch(request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data.json(); }
  catch (e) { data = { title: 'MD Automobile', body: event.data?.text() || '' }; }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: data.data || {},
    vibrate: [200, 100, 200],
    tag: data.tag || 'general',
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(data.title || 'MD Automobile', options));
});

// Click on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(url.split('?')[0]) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
