// Service Worker for Tic Tac Toe PWA
const CACHE_NAME = 'tic-tac-toe-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './config.js',
    './manifest.json',
    './assets/icons/icon.svg',
    './assets/icons/192.png',
    './assets/icons/512.png',
    './assets/icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Bypass the HTTP cache so the precache always gets fresh files
            return cache.addAll(ASSETS_TO_CACHE.map((url) => new Request(url, { cache: 'reload' })));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Only handle requests for same origin (never Supabase or CDN requests)
    if (url.origin !== self.location.origin) return;

    // Network-First strategy: always fetch fresh assets when online, fallback to cache when offline
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Skip query variants (e.g. ?room=CODE) so the cache does not grow per room link
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' && !url.search) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    // Navigations such as ?room=CODE fall back to the cached app shell
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return Response.error();
                });
            })
    );
});
