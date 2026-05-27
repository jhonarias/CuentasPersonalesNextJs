// public/sw.js
// Service Worker — caché para carga instantánea (PWA)

const CACHE_NAME = 'gastos-ia-v2'

// Instalación: no pre-cachear páginas HTML — se obtienen siempre de la red
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(['/manifest.json'])))
  self.skipWaiting()
})

// Activación: limpiar cachés antiguas (incluye v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. API: siempre red, nunca caché
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // 2. Navegación HTML (/, /dashboard, etc.): Network-first
  //    Intenta la red → si falla (offline) usa caché como fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const cloned = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // 3. Assets estáticos de Next.js (_next/static): Cache-first
  //    Son seguros de cachear porque Next.js les pone hash en el nombre
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const cloned = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
          }
          return response
        })
      })
    )
    return
  }

  // 4. Resto (imágenes, fuentes, etc.): Network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (request.method === 'GET' && response.status === 200) {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
