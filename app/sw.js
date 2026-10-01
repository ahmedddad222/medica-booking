const CACHE_NAME = 'medica-mobile-v2'
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './mobile.css',
  './pwa.js',
  './assets/index-C5wl6y5-.js',
  './medica-icon.svg',
  './print.html',
  './print.css',
  './print-portal.css',
  './print.js'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

async function networkFirst(request) {
  try {
    const response = await fetch(request)
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

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  const networkPromise = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone()).catch(() => undefined)
    return response
  }).catch(() => null)
  return cached || networkPromise || Response.error()
}

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  event.respondWith(networkFirst(request))
})
