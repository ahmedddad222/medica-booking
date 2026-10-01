const CACHE_NAME = 'medica-mobile-v3c'
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './mobile.css',
  './mobile-v3.css',
  './mobile-v3-admin.css',
  './pwa.js',
  './assets/index-C5wl6y5-.js',
  './medica-icon.svg',
  './print.html',
  './print.css',
  './print-portal.css',
  './print.js'
]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => undefined)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' })
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone()).catch(() => undefined)
    }
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) return cached
    if (request.mode === 'navigate') return caches.match('./index.html')
    throw error
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone()).catch(() => undefined)
  }
  return response
}

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate' || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(networkFirst(request))
    return
  }
  if (['image','font'].includes(request.destination)) {
    event.respondWith(cacheFirst(request))
    return
  }
  event.respondWith(networkFirst(request))
})
