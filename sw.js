/* 简记 PWA service worker v1.1.0. Never intercept ledger data or backup downloads. */
'use strict';
const CACHE_NAME = 'jianji-shell-v1.1.0';
const CACHE_PREFIX = 'jianji-shell-';
const SHELL_FILES = [
  './index.html', './pwa.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];
const SHELL_URLS = SHELL_FILES.map(path => new URL(path, self.registration.scope).href);
const INDEX_URL = new URL('./index.html', self.registration.scope).href;
const VERSION_URL = new URL('./version.json', self.registration.scope).href;

self.addEventListener('install', event => {
  // All-or-nothing: a version cannot activate unless its full offline shell is cached.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_URLS.map(url => new Request(url, {cache: 'reload'})));
  })());
  // Intentionally no automatic skipWaiting: avoid throwing away an unsaved form.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Scope is the deployment folder; ignore other paths on the same host.
  if (!url.href.startsWith(self.registration.scope)) return;
  // Version must always be fetched from the network when possible.
  if (url.href.split('?')[0] === VERSION_URL) return;
  if (request.mode === 'navigate') {
    const pagePath = url.pathname.replace(/\/+$/,'/');
    const base = new URL(self.registration.scope);
    if (pagePath !== base.pathname && url.pathname !== new URL(INDEX_URL).pathname) return;
    event.respondWith((async () => {
      const cached = await (await caches.open(CACHE_NAME)).match(INDEX_URL);
      return cached || fetch(request);
    })());
    return;
  }
  const resolved = new URL(url.pathname, url.origin).href;
  if (!SHELL_URLS.includes(resolved)) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(CACHE_NAME)).match(resolved);
    return cached || fetch(request);
  })());
});
